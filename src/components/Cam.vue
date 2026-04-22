<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue';
import { useRouter } from 'vue-router';

import Header from './Header.vue';
import polaroid from './Polaroid.vue';

const router = useRouter();

const video = ref(null);
const canvas = ref(null);
const image = ref(null);
const videoDevices = ref([]);
const selectedDevice = ref('');
const isUploading = ref(false);

const uploadImage = inject('uploadImage');

const sound1 = new Audio('/click.mp3');
const countDown = ref(0);


onMounted(async () => {
  await getVideoDevices();
  if (videoDevices.value.length > 0) {
    selectedDevice.value = videoDevices.value[0].deviceId;
    await startCamera();
  }
  if(!global.value.features.camera) {
    router.push('/');
  }
});

onUnmounted(() => {
  stopCamera();
});

async function getVideoDevices() {
  try {
    const permission = await navigator.mediaDevices.getUserMedia({ video: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices.value = devices.filter(device => device.kind === 'videoinput');
    permission.getTracks().forEach(track => track.stop());
  } catch (error) {
    console.error('Error getting video devices:', error);
  }
}

async function startCamera() {
  if (!selectedDevice.value) return;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: selectedDevice.value ? { exact: selectedDevice.value } : undefined
      }
    });
    
    if (video.value) {
      video.value.srcObject = stream;
      video.value.play();
    }
  } catch (error) {
    console.error('Error accessing camera:', error);
  }
}

function stopCamera() {
  if (video.value && video.value.srcObject) {
    video.value.srcObject.getTracks().forEach(track => track.stop());
    video.value.srcObject = null;
  }
}

async function changeCamera() {
  stopCamera();
  await startCamera();
}

async function shotPrepare() {
  countDown.value = global.value.isDebug() ? 1 : global.value.countDownSeconds;
  const showCount = () => {
    console.log(countDown.value);
  }
  showCount();
  const interval = setInterval(() => {
    countDown.value--;
    showCount();
    if (countDown.value == 0) {
      clearInterval(interval);
      document.querySelector('.shotOverlay').style.opacity = '1';
      setTimeout(() => {
        document.querySelector('.shotOverlay').style.opacity = '0';
      }, 300);
      shot();
    }
  }, 1000);
}


async function shot() {
  if(!global.value.isDebug()) sound1.play();
  //return; // debug
  if (!video.value) return;

  const imageId = `${new Date().getTime()}`
  const imageExtension = 'jpg'
  const imageFilename = `${imageId}.${imageExtension}`
  
  // Create canvas if it doesn't exist
  if (!canvas.value) {
    canvas.value = document.createElement('canvas');
  }
  
  // Set canvas dimensions to match video
  canvas.value.width = video.value.videoWidth;
  canvas.value.height = video.value.videoHeight;
  
  // Draw current video frame to canvas
  const ctx = canvas.value.getContext('2d');
  ctx.drawImage(video.value, 0, 0, canvas.value.width, canvas.value.height);
  
  // Get image as data URL
  image.value = canvas.value.toDataURL(`image/${imageExtension}`);
  
  // Download a local copy
  if(global.value.isDebug()) {
    const link = document.createElement('a');
    link.download = `${imageFilename}`;
    link.href = image.value;
    link.click();
  }
  
  try {
    isUploading.value = true;
    const result = await uploadImage(image.value, imageId);
    if (result) {
      console.log('Image processed successfully with result:', result);
      // go to detail page
      global.value.isUploading = false
      global.value.isLoading = false
      router.push(`/detail/${global.value.docId}`);
    } else {
      console.error('Error processing image');
    }
    
    isUploading.value = false;
    global.value.isLoading = false
  } catch (error) {
    console.error('Error processing image:', error);
    isUploading.value = false;
    global.value.isLoading = false
  }
}
</script>

<template>
  <div class="relative w-full h-full flex flex-col items-center justify-center">
    <div class="shotOverlay absolute w-full h-full z-2 bg-white"></div>
    <div 
      v-if="countDown > 0"
      class="flex justify-center items-center absolute top-0 left-0 w-full h-90 opacity-70 text-[#FF7230] text-[50vw] sm:text-[30vw] font-bold z-9999">
      {{ countDown }}
    </div>

    <div class="relative z-10 flex flex-col items-center w-full">
      <polaroid class="mb-8">
        <video ref="video" class="cam object-cover"></video>
      </polaroid>
      <select v-model="selectedDevice" @change="changeCamera" class="mt-2 p-2 rounded text-white">
        <option v-for="device in videoDevices" :key="device.deviceId" :value="device.deviceId">
          {{ device.label || `Camera ${videoDevices.indexOf(device) + 1}` }}
        </option>
      </select>
      <button class="btn-primary rounded-60 bg-[#FF7230] text-white w-fit mt-4 mb-16" @click="shotPrepare" :disabled="isUploading">
        {{ isUploading ? 'Caricamento...' : 'Scatta' }}
      </button>
    </div>

  </div>
</template>


<style scoped>
.cam {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1); /* Mirror the webcam image horizontally */
}
.shotOverlay {
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
  pointer-events: none;
}
</style>