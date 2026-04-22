  <script setup>
import { ref, provide } from 'vue';

import { storage, db } from './firebase'
import { ref as storageRef, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore'

import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Loading from './components/Loading.vue'
import Auth from './components/Auth.vue'
import Debug from './components/Debug.vue'


const edition = import.meta.env.VITE_EDITION 
const urlParams = new URLSearchParams(window.location.search);

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
})
window.global = global; // for debug purposes


const getStorageUrl = async (str) => {
  if(!str) return null;
  const url = str.split('\/o\/')[1].split("?")[0].replaceAll("%2F", "/")
  const imageRef = storageRef(storage, url)
  const storageUrl = await getDownloadURL(imageRef)
  console.log(storageUrl)
  return storageUrl
}

const processImage = async (docId) => {
  // call process function with selected poster from list
  const posterPath = global.value.poster?.file_path;
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


const getResult = async (docId) => {
  const maxChecks = 30;
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
  } else {
    if (checkCount < maxChecks) {
      setTimeout(() => {
        getResult(docId)
      }, 5000)
    } else {
      console.log(`failed to get result after ${maxChecks} checks`)
      await updateDoc(docRef, {
        status: 'failed',
      })
    }
  }
 
  return data;
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
  <main class="min-h-screen p-4 md:p-8">
  <div class="flex flex-col max-w-screen max-h-screen mx-auto min-w-screen min-h-screen">
      <Loading v-if="global.isLoading" />
      <div class="flex justify-end w-full print:hidden z-30">
        <div class="auth-btn">
          <Auth/>
        </div>
      </div>
      <Header />
      <router-view />
      <Footer />
    </div>
    <Debug v-if="global.isDebug()" />
  </main>
</template>

<style>
</style>