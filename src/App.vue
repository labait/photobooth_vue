<script setup>
import { ref, provide, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

import { storage, db, auth } from './firebase'
import { ref as storageRef, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore'

import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Loading from './components/Loading.vue'
import Auth from './components/Auth.vue'
import Debug from './components/Debug.vue'
import Dialog from './components/Dialog.vue'
import MaintenanceNotice from './components/MaintenanceNotice.vue'
import { posterServerPath } from './images.js'
import { editionCode, loadEdition } from './editionConfig.js'
import { itemStoragePath, ITEM_IMAGE_FILES } from './itemStorage.js'
import { isTrue, timeframeHuman } from './composables/useUtils'
import { useAuth } from './composables/useAuth'
import { useGenerationCounts } from './composables/useGenerationCounts'
import * as Sentry from '@sentry/vue'

const router = useRouter()
const route = useRoute()
const { isAdmin, authReady } = useAuth()
const maintenanceActive = isTrue(import.meta.env.VITE_MAINTENANCE)
const edition = editionCode
const urlParams = new URLSearchParams(window.location.search);

const LOCALSTORE_PREFIX = import.meta.env.VITE_LOCALSTORE_KEY_PREFIX || 'photobooth_'
const LIMIT_USER_NUMBER = Number(import.meta.env.VITE_LIMIT_USER_NUMBER)
const LIMIT_USER_TIMEFRAME = Number(import.meta.env.VITE_LIMIT_USER_TIMEFRAME)
const LIMIT_TOTAL_NUMBER = Number(import.meta.env.VITE_LIMIT_TOTAL_NUMBER)
const LIMIT_TOTAL_TIMEFRAME = Number(import.meta.env.VITE_LIMIT_TOTAL_TIMEFRAME)
const limitAdminOverride = isTrue(import.meta.env.VITE_LIMIT_ADMIN_OVERRIDE)
const LOADING_GENERATION = 'Generazione in corso, NON chiudere la finestra del browser'
const GENERATION_DURATION_MEDIAN = Number(import.meta.env.VITE_GENERATION_DURATION_MEDIAN) || 60

let generationStartedAt = null
let generationProgressTimer = null

function stopGenerationProgress() {
  if (generationProgressTimer) {
    clearInterval(generationProgressTimer)
    generationProgressTimer = null
  }
  generationStartedAt = null
  global.value.loading_progress = null
}

function startGenerationProgress() {
  stopGenerationProgress()
  global.value.generationCancelled = false
  generationStartedAt = Date.now()
  global.value.isLoading = `${LOADING_GENERATION}, la generazione richiederà circa ${GENERATION_DURATION_MEDIAN} secondi`
  global.value.loading_progress = 0

  generationProgressTimer = setInterval(() => {
    if (!generationStartedAt) return

    const elapsed = Date.now() - generationStartedAt
    const totalMs = GENERATION_DURATION_MEDIAN * 1000
    const progress = Math.min(99, Math.round((elapsed / totalMs) * 100))
    global.value.loading_progress = progress
  }, 250)
}

let activeGetResultTimer = null

function cancelGeneration() {
  global.value.generationCancelled = true
  if (activeGetResultTimer) {
    clearTimeout(activeGetResultTimer)
    activeGetResultTimer = null
  }
  stopGenerationProgress()
  global.value.isLoading = null
}

function resetGenerationCancellation() {
  global.value.generationCancelled = false
  if (activeGetResultTimer) {
    clearTimeout(activeGetResultTimer)
    activeGetResultTimer = null
  }
}

function storeValue(key, value = null) {
  const storageKey = `${LOCALSTORE_PREFIX}${key}`
  const isRead = arguments.length < 2 || value === null

  if (isRead) {
    const stored = localStorage.getItem(storageKey)
    return stored === null ? null : stored
  }

  localStorage.setItem(storageKey, String(value))
  return value
}

function parseGenerations(raw) {
  if (!raw) return []
  return raw.split(',').filter(Boolean).map(Number).filter((ts) => !Number.isNaN(ts))
}

function generationsInWindow(raw, windowStartMs) {
  return parseGenerations(raw).filter((ts) => ts >= windowStartMs)
}

function recordGeneration() {
  const now = Date.now()
  const windowStart = now - (LIMIT_USER_TIMEFRAME || 0) * 1000
  const raw = storeValue('generations') ?? ''
  const timestamps = LIMIT_USER_TIMEFRAME
    ? generationsInWindow(raw, windowStart)
    : parseGenerations(raw)
  timestamps.push(now)
  storeValue('generations', timestamps.join(','))
  generationCounts.refreshUserCount()
}

function showLimitDialog(title, limitNumber, limitTimeframe) {
  global.value.dialog = {
    title,
    text: `max ${limitNumber} generazioni in ${timeframeHuman(limitTimeframe)}\ntorna a visitarci e riprova più tardi`,
    confirmText: 'OK',
    onConfirm: () => {
      global.value.dialog = {}
      router.push('/')
    },
  }
}

function showGenerationErrorDialog(errorMessage, context = {}) {
  const detail = String(errorMessage ?? 'Errore sconosciuto')

  Sentry.captureException(new Error(detail), {
    extra: context,
    tags: { source: 'generation' },
  })

  global.value.dialog = {
    title: 'Errore',
    text: 'Si è verificato un errore nella generazione immagine, abbiamo allertato chi di dovere, riprova più tardi',
    errorDetail: detail,
    confirmText: 'OK',
    onConfirm: () => {
      global.value.dialog = {}
      router.push('/')
    },
  }
}

async function recordGenerationFailure(docRef, errorMessage) {
  await updateDoc(docRef, {
    status: 'failed',
    error: String(errorMessage),
  })
}

function failGeneration(errorMessage, context = {}) {
  if (global.value.generationCancelled) {
    stopGenerationProgress()
    global.value.isLoading = null
    return
  }
  stopGenerationProgress()
  global.value.isLoading = null
  showGenerationErrorDialog(errorMessage, context)
}

function checkLimit(count, limitNumber, limitTimeframe, title) {
  if (!limitTimeframe) return true
  if (!limitNumber && limitNumber !== 0) return true
  if (count < limitNumber) return true
  if (limitAdminOverride && isAdmin.value) return true

  showLimitDialog(title, limitNumber, limitTimeframe)
  return false
}

function validateLimitUser() {
  const raw = storeValue('generations') ?? ''
  const windowStart = LIMIT_USER_TIMEFRAME ? Date.now() - LIMIT_USER_TIMEFRAME * 1000 : 0
  const count = (LIMIT_USER_TIMEFRAME
    ? generationsInWindow(raw, windowStart)
    : parseGenerations(raw)
  ).length

  return checkLimit(count, LIMIT_USER_NUMBER, LIMIT_USER_TIMEFRAME, 'Limite utente raggiunto')
}

function validateLimitTotal() {
  return checkLimit(
    global.value.generations_count_total_window,
    LIMIT_TOTAL_NUMBER,
    LIMIT_TOTAL_TIMEFRAME,
    'Limite totale raggiunto'
  )
}

function validateLimits() {
  return validateLimitUser() && validateLimitTotal()
}

const global = ref({
  countDownSeconds: 3,
  edition: null,
  poster: null,
  isDebug: () =>{
    return urlParams.has('debug') || false;
  },
  isLoading: null,
  loading_progress: null,
  generationCancelled: false,
  currentImage: null,
  docData: null,
  features: {
    'list': true,
    'camera': true,
  },
  dialog: {},
  env: {},
  generations_count_user: 0,
  generations_count_total: 0,
  generations_count_daily: 0,
  generations_count_total_window: 0,
  storeValue,
  validateLimitUser,
  validateLimitTotal,
  validateLimits,
  recordGeneration,
  startGenerationProgress,
  stopGenerationProgress,
  cancelGeneration,
  resetGenerationCancellation,
})
window.global = global; // for debug purposes

const generationCounts = useGenerationCounts({
  global,
  edition,
  parseGenerations,
  storeValue,
  storageKeyPrefix: LOCALSTORE_PREFIX,
  limitTotalTimeframe: LIMIT_TOTAL_TIMEFRAME,
})

function syncEnvForAdmin() {
  global.value.env = authReady.value && isAdmin.value
    ? Object.fromEntries(
        Object.entries(import.meta.env).filter(([key]) => key.startsWith('VITE_'))
      )
    : {}
}

onMounted(async () => {
  if (storeValue('generations') === null) {
    storeValue('generations', '')
  }
  try {
    global.value.edition = await loadEdition()
  } catch (error) {
    console.error('Failed to load edition.json:', error)
  }
  generationCounts.init()
})

onUnmounted(() => {
  generationCounts.destroy()
  stopGenerationProgress()
})

watch([isAdmin, authReady], syncEnvForAdmin, { immediate: true })

watch([isAdmin, authReady, () => route.path], () => {
  if (
    maintenanceActive &&
    authReady.value &&
    isAdmin.value &&
    route.path === '/maintenance'
  ) {
    router.replace('/')
  }
})


const getStorageUrl = async (str) => {
  if (!str) return null;
  // URL già risolto in Firestore: usalo così com'è (evita lookup ridondante sul bucket EU)
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  try {
    const imageRef = storageRef(storage, str);
    return await getDownloadURL(imageRef);
  } catch {
    return null;
  }
}

const processImage = async (docId) => {
  const posterPath = global.value.poster?.file_path
    ? posterServerPath(global.value.poster.file_path)
    : null;
  const generationsRaw = storeValue('generations') ?? ''
  const params = new URLSearchParams({ docId, generations: generationsRaw, edition })
  if (posterPath) params.set('poster', posterPath)

  const headers = {}
  if (auth.currentUser) {
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`
  }

  const processUrl = `/.netlify/functions/processImage?${params.toString()}`
  console.log('processUrl', processUrl);

  let data = null
  try {
    const response = await fetch(processUrl, { headers })
    data = await response.json()
    if (!response.ok || data?.error) {
      if (global.value.generationCancelled) return false
      if (data?.limitNumber != null && data?.limitTimeframe != null) {
        showLimitDialog(data.error, data.limitNumber, data.limitTimeframe)
      } else {
        showGenerationErrorDialog(data?.error || data?.message || 'Errore processamento immagine', {
          docId,
          phase: 'processImage',
        })
      }
      return false
    }
    return true
  } catch (error) {
    console.error('Error processing image:', error)
    if (global.value.generationCancelled) return false
    showGenerationErrorDialog(error, { docId, phase: 'processImage' })
    return false
  }
}

const uploadImage = async (imageDataUrl, imageId) => {
  try {
    startGenerationProgress()
    global.value.recordGeneration()

    const docRef = await addDoc(collection(db, 'items'), {
      timestamp: serverTimestamp(),
      image_id: imageId,
      status: 'created',
      edition,
    })

    const imageRef = storageRef(
      storage,
      itemStoragePath(edition, imageId, ITEM_IMAGE_FILES.source),
    )
    await uploadString(imageRef, imageDataUrl, 'data_url')
    global.value.currentImage = imageDataUrl;
    const downloadURL = await getDownloadURL(imageRef)
    await updateDoc(docRef, {
      image_source: downloadURL,
    })

    if (global.value.generationCancelled) return false
    
    const docData = (await getDoc(docRef)).data();
    global.value.docData = docData;
    global.value.docId = docRef.id;
    console.log('docData',global.value)

    if (global.value.generationCancelled) return false

    return processImage(docRef.id)

  } catch (error) {
    console.error('Error uploading image:', error)
    return false;
  }
}


const getResult = (docId) => {
  const maxChecks = 30;

  return new Promise((resolve) => {
    const check = async () => {
      if (global.value.generationCancelled) {
        resolve(null)
        return
      }

      const docRef = doc(db, 'items', docId)
      const docData = await getDoc(docRef)
      let checkCount = docData.data()?.check_count || 0;

      const getImageProcessedUrl = `/.netlify/functions/getImageProcessed?docId=${docId}`;
      console.log(`getImageProcessedUrl ${docId}, checkCount ${checkCount}`, getImageProcessedUrl);

      let data
      try {
        const response = await fetch(getImageProcessedUrl);
        data = await response.json()
        console.log('getResult data', data)
      } catch (error) {
        const errorMessage = error?.message || String(error)
        try {
          await recordGenerationFailure(docRef, errorMessage)
        } catch (updateError) {
          console.error('Failed to save generation error on item', updateError)
        }
        failGeneration(errorMessage, { docId, phase: 'fetch' })
        resolve(null)
        return
      }

      const processStatus = data?.process_result?.status
      const errorMessage = data?.error
        || (processStatus === 'failed' || processStatus === 'canceled'
          ? (data?.process_result?.error || 'Generazione fallita')
          : null)

      if (errorMessage) {
        try {
          await recordGenerationFailure(docRef, errorMessage)
        } catch (updateError) {
          console.error('Failed to save generation error on item', updateError)
        }
        failGeneration(errorMessage, { docId, checkCount, processStatus })
        resolve(null)
        return
      }

      checkCount = checkCount + 1;
      await updateDoc(docRef, {
        check_count: checkCount,
      })

      if (data?.process_result?.status == "succeeded") {
        global.value.loading_progress = 100
        global.value.docData = data;
        console.log('docData', data)
        resolve(data);
      } else {
        if (checkCount < maxChecks) {
          activeGetResultTimer = setTimeout(check, 5000)
        } else {
          console.log(`failed to get result after ${maxChecks} checks`)
          const timeoutError = data?.process_result?.error
            || `Timeout: generazione non completata dopo ${maxChecks} tentativi`
          try {
            await recordGenerationFailure(docRef, timeoutError)
          } catch (updateError) {
            console.error('Failed to save generation timeout on item', updateError)
          }
          resolve(data);
        }
      }
    }

    check()
  })
}


const detailUrl = (docId) => {
  return `${window.location.origin}/detail/${docId}`
}


provide('global', global);
provide('processImage', processImage);
provide('uploadImage', uploadImage);
provide('getResult', getResult);
provide('detailUrl', detailUrl);
provide('getStorageUrl', getStorageUrl);

</script>

<template>
  <main class="app-shell relative flex min-h-screen flex-col bg-[var(--page-bg)] print:min-h-0 print:bg-white">
    <MaintenanceNotice v-if="maintenanceActive && isAdmin" />
    <Loading v-if="global.isLoading != null && $route.path !== '/admin'" />
    <div
      class="auth-btn print:hidden mb-8 mt-8 px-8 flex justify-end"
      :class="maintenanceActive ? 'relative z-[210]' : 'z-40'"
    >
      <Auth />
    </div>
    <div class="flex flex-1 flex-col">
      <Header />
      <router-view class="flex flex-1 flex-col" />
      <Footer />
    </div>
    <Debug v-if="global.isDebug()" />
    <Dialog v-if="global.dialog.title != null || global.dialog.text != null" />
  </main>
</template>

<style>
</style>