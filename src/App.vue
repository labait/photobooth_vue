<script setup>
import { ref, provide, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { storage, db } from './firebase'
import { ref as storageRef, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore'

import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Loading from './components/Loading.vue'
import Auth from './components/Auth.vue'
import Debug from './components/Debug.vue'
import Dialog from './components/Dialog.vue'
import { posterServerPath } from './posters.js'


const router = useRouter()
const edition = import.meta.env.VITE_EDITION
const urlParams = new URLSearchParams(window.location.search);

const LOCALSTORE_PREFIX = import.meta.env.VITE_LOCALSTORE_KEY_PREFIX || 'photobooth_'
const LIMIT_NUMBER = Number(import.meta.env.VITE_LIMIT_NUMBER)
const LIMIT_TIMEFRAME = Number(import.meta.env.VITE_LIMIT_TIMEFRAME)

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
  const windowStart = now - (LIMIT_TIMEFRAME || 0) * 1000
  const raw = storeValue('generations') ?? ''
  const timestamps = LIMIT_TIMEFRAME
    ? generationsInWindow(raw, windowStart)
    : parseGenerations(raw)
  timestamps.push(now)
  storeValue('generations', timestamps.join(','))
}

function validateLimit() {
  const raw = storeValue('generations') ?? ''
  const windowStart = LIMIT_TIMEFRAME ? Date.now() - LIMIT_TIMEFRAME * 1000 : 0
  const timestamps = LIMIT_TIMEFRAME
    ? generationsInWindow(raw, windowStart)
    : parseGenerations(raw)
  const count = timestamps.length; +100 // debug  

  console.log('[validateLimit]', count, timestamps)

  if (!LIMIT_NUMBER || !LIMIT_TIMEFRAME) return true

  if (count < LIMIT_NUMBER) return true

  global.value.dialog = {
    title: 'Limite raggiunto',
    text: `max ${LIMIT_NUMBER} generazioni in ${LIMIT_TIMEFRAME} secondi`,
    confirmText: 'OK',
    onConfirm: () => {
      global.value.dialog = {}
      router.push('/')
    },
  }
  return false
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
  storeValue,
  validateLimit,
  recordGeneration,
})
window.global = global; // for debug purposes

onMounted(() => {
  if (storeValue('generations') === null) {
    storeValue('generations', '')
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

    const imageRef = storageRef(storage, `images/${imageId}/${imageId}.png`)
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
    <Loading v-if="global.isLoading && $route.path !== '/admin'" />
    <div class="auth-btn z-40 print:hidden mb-8 mt-8 px-8 flex justify-end">
      <Auth />
    </div>
    <div class="flex flex-1 flex-col">
      <Header />
      <router-view class="flex flex-1 flex-col" />
      <Footer />
    </div>
    <Debug v-if="global.isDebug()" />
    <Dialog v-if="global.dialog.text != null" />
  </main>
</template>

<style>
</style>