<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

const framePath = '/images/frame.png';

const route = useRoute();
const router = useRouter();

const mode = ref('upload');
const fileInput = ref(null);
const video = ref(null);
const canvas = ref(null);
const previewDataUrl = ref(null);
const resultUrl = ref(null);
const isSubmitting = ref(false);
const error = ref(null);
const videoDevices = ref([]);
const selectedDevice = ref('');

const loadResultFromQuery = async () => {
  const path = route.query.path;
  if (!path || typeof path !== 'string') {
    resultUrl.value = null;
    return;
  }

  try {
    const url = await getDownloadURL(storageRef(storage, path));
    resultUrl.value = url;
  } catch (err) {
    console.error('Errore caricamento risultato:', err);
    error.value = 'Impossibile caricare il risultato salvato';
  }
};

watch(() => route.query.path, loadResultFromQuery);

onMounted(async () => {
  await loadResultFromQuery();
  await initWebcam();
});

onUnmounted(() => {
  stopCamera();
});

const initWebcam = async () => {
  try {
    const permission = await navigator.mediaDevices.getUserMedia({ video: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices.value = devices.filter((d) => d.kind === 'videoinput');
    permission.getTracks().forEach((track) => track.stop());

    if (videoDevices.value.length > 0) {
      selectedDevice.value = videoDevices.value[0].deviceId;
      await startCamera();
    }
  } catch (err) {
    console.warn('Webcam non disponibile:', err);
  }
};

const startCamera = async () => {
  if (!selectedDevice.value) return;
  stopCamera();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: selectedDevice.value } },
    });
    if (video.value) {
      video.value.srcObject = stream;
      await video.value.play();
    }
  } catch (err) {
    console.error('Errore webcam:', err);
    error.value = 'Impossibile accedere alla webcam';
  }
};

const stopCamera = () => {
  if (video.value?.srcObject) {
    video.value.srcObject.getTracks().forEach((track) => track.stop());
    video.value.srcObject = null;
  }
};

const changeCamera = async () => {
  await startCamera();
};

const onFileChange = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    previewDataUrl.value = reader.result;
    error.value = null;
  };
  reader.readAsDataURL(file);
};

const captureFromWebcam = () => {
  if (!video.value) return;

  if (!canvas.value) {
    canvas.value = document.createElement('canvas');
  }

  canvas.value.width = video.value.videoWidth;
  canvas.value.height = video.value.videoHeight;
  const ctx = canvas.value.getContext('2d');
  ctx.drawImage(video.value, 0, 0);

  previewDataUrl.value = canvas.value.toDataURL('image/jpeg', 0.92);
  error.value = null;
};

const submit = async () => {
  if (!previewDataUrl.value) {
    error.value = 'Seleziona o scatta un\'immagine prima di inviare';
    return;
  }

  isSubmitting.value = true;
  error.value = null;

  try {
    const response = await fetch('/.netlify/functions/composeTestFrame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: previewDataUrl.value }),
    });

    const raw = await response.text();
    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(raw || 'Risposta non valida dal server');
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          'Function non trovata. Avvia il progetto con "netlify dev" e usa http://localhost:8888'
        );
      }
      throw new Error(data.error || 'Errore durante la composizione');
    }

    resultUrl.value = data.url;
    await router.replace({ path: '/test', query: { path: data.storagePath } });
  } catch (err) {
    console.error(err);
    error.value = err.message || 'Errore durante il submit';
  } finally {
    isSubmitting.value = false;
  }
};

const reset = () => {
  previewDataUrl.value = null;
  error.value = null;
  if (fileInput.value) fileInput.value.value = '';
};
</script>

<template>
  <div class="test-upload w-full max-w-2xl mx-auto py-6 text-white">
    <h1 class="text-2xl font-bold mb-2">Test composizione frame</h1>
    <p class="text-white/70 text-sm mb-6">
      Carica un'immagine o scatta una foto: verrà inserita dietro il frame e salvata in Firebase Storage.
    </p>

    <div class="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
      <p class="text-xs text-white/60 mb-2">Frame di riferimento</p>
      <img :src="framePath" alt="Frame" class="w-full max-w-xs mx-auto block" />
    </div>

    <div class="flex gap-2 mb-4">
      <button
        type="button"
        class="btn-secondary"
        :class="{ 'opacity-60': mode !== 'upload' }"
        @click="mode = 'upload'"
      >
        Carica file
      </button>
      <button
        type="button"
        class="btn-secondary"
        :class="{ 'opacity-60': mode !== 'webcam' }"
        @click="mode = 'webcam'"
      >
        Webcam
      </button>
    </div>

    <div v-if="mode === 'upload'" class="mb-4">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="block w-full text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-black file:cursor-pointer"
        @change="onFileChange"
      />
    </div>

    <div v-else class="mb-4 flex flex-col items-center gap-3">
      <video
        ref="video"
        autoplay
        playsinline
        muted
        class="w-full max-w-sm aspect-[4/5] object-cover rounded-lg bg-black mirror"
      />
      <select
        v-if="videoDevices.length > 1"
        v-model="selectedDevice"
        class="p-2 rounded text-black text-sm"
        @change="changeCamera"
      >
        <option v-for="device in videoDevices" :key="device.deviceId" :value="device.deviceId">
          {{ device.label || 'Camera' }}
        </option>
      </select>
      <button type="button" class="btn-secondary" @click="captureFromWebcam">
        Scatta foto
      </button>
    </div>

    <div v-if="previewDataUrl" class="mb-4">
      <p class="text-xs text-white/60 mb-2">Anteprima sorgente</p>
      <img :src="previewDataUrl" alt="Anteprima" class="w-full max-w-xs mx-auto rounded-lg" />
      <button type="button" class="text-white/60 text-sm mt-2 hover:text-white cursor-pointer" @click="reset">
        Cambia immagine
      </button>
    </div>

    <button
      type="button"
      class="btn-primary mb-6"
      :disabled="isSubmitting || !previewDataUrl"
      @click="submit"
    >
      {{ isSubmitting ? 'Composizione in corso...' : 'Componi e salva' }}
    </button>

    <p v-if="error" class="text-red-400 text-sm mb-4">{{ error }}</p>

    <div v-if="resultUrl" class="p-4 rounded-lg bg-white/5 border border-white/10">
      <p class="text-sm font-medium mb-3">Risultato composizione</p>
      <img :src="resultUrl" alt="Risultato" class="w-full max-w-md mx-auto rounded-lg" />
      <p v-if="route.query.path" class="text-xs text-white/50 mt-3 break-all">
        Path: {{ route.query.path }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.mirror {
  transform: scaleX(-1);
}
</style>
