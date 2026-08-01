<script setup>
import { ref, provide, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

import { storage, db } from './firebase'
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
import { itemStoragePath, ITEM_IMAGE_FILES } from './itemStorage.js'
import { isTrue } from './composables/useUtils'
import { useAuth } from './composables/useAuth'
import { useGenerationCounts } from './composables/useGenerationCounts'


const router = useRouter()
const route = useRoute()
const { isAdmin, authReady } = useAuth()
const maintenanceActive = isTrue(import.meta.env.VITE_MAINTENANCE)
const edition = import.meta.env.VITE_EDITION
const urlParams = new URLSearchParams(window.location.search);

const LOCALSTORE_PREFIX = import.meta.env.VITE_LOCALSTORE_KEY_PREFIX || 'photobooth_'
const LIMIT_USER_NUMBER = Number(import.meta.env.VITE_LIMIT_USER_NUMBER)
const LIMIT_USER_TIMEFRAME = Number(import.meta.env.VITE_LIMIT_USER_TIMEFRAME)
const LIMIT_TOTAL_NUMBER = Number(import.meta.env.VITE_LIMIT_TOTAL_NUMBER)
const LIMIT_TOTAL_TIMEFRAME = Number(import.meta.env.VITE_LIMIT_TOTAL_TIMEFRAME)
const limitAdminOverride = isTrue(import.meta.env.VITE_LIMIT_ADMIN_OVERRIDE)

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
    text: `max ${limitNumber} generazioni in ${limitTimeframe} secondi`,
    confirmText: 'OK',
    onConfirm: () => {
      global.value.dialog = {}
      router.push('/')
    },
  }
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
  poster: null,
  isDebug: () =>{
    return urlParams.has('debug') || false;
  },
  isLoading: false,
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

onMounted(() => {
  if (storeValue('generations') === null) {
    storeValue('generations', '')
  }
  generationCounts.init()
})

onUnmounted(() => {
  generationCounts.destroy()
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
  // call process function with selected poster from list
  const posterPath = global.value.poster?.file_path
    ? posterServerPath(global.value.poster.file_path)
    : null;
  const processUrl = `/.netlify/functions/processImage?docId=${encodeURIComponent(docId)}${posterPath ? `&poster=${encodeURIComponent(posterPath)}` : ''}`;
  console.log('processUrl', processUrl);
  const response = await fetch(processUrl);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error processing image:', errorText);
    return false;
  }
  return true;
}

const uploadImage = async (imageDataUrl, imageId) => {
  try {
    global.value.isLoading = true;
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
    
    const docData = (await getDoc(docRef)).data();
    global.value.docData = docData;
    global.value.docId = docRef.id;
    console.log('docData',global.value)

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
      const docRef = doc(db, 'items', docId)
      const docData = await getDoc(docRef)
      let checkCount = docData.check_count || 0;

      // call process function
      const getImageProcessedUrl = `/.netlify/functions/getImageProcessed?docId=${docId}`;
      console.log(`getImageProcessedUrl ${docId}, checkCount ${checkCount}`, getImageProcessedUrl);
      const response = await fetch(getImageProcessedUrl);
      const data = await response.json()
      console.log('getResult data', data)

      checkCount = checkCount + 1;
      await updateDoc(docRef, {
        check_count: checkCount,
      })

      if (data?.process_result?.status == "succeeded") {
        global.value.docData = data;
        console.log('docData', data)
        resolve(data); // pronto: solo ora il chiamante riceve il risultato
      } else {
        if (checkCount < maxChecks) {
          setTimeout(check, 5000) // riprova, senza risolvere ancora
        } else {
          console.log(`failed to get result after ${maxChecks} checks`)
          await updateDoc(docRef, {
            status: 'failed',
          })
          resolve(data); // si arrende dopo maxChecks, ma comunque risolve per non bloccare per sempre
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
  <main class="app-shell relative flex min-h-screen flex-col bg-[var(--page-bg)]">
    <MaintenanceNotice v-if="maintenanceActive && isAdmin" />
    <Loading v-if="global.isLoading && $route.path !== '/admin'" />
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