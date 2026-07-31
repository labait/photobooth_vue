<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue'
import { useRouter } from 'vue-router'

import Consents from './Consents.vue'

const router = useRouter()
const global = inject('global')

const video = ref(null)
const canvas = ref(null)
const image = ref(null)
const videoDevices = ref([])
const selectedDevice = ref('')
const isUploading = ref(false)
const shotOverlay = ref(null)

const uploadImage = inject('uploadImage')
const getResult = inject('getResult')

const sound1 = new Audio('/click.mp3')
const countDown = ref(0)

const CAM_STORAGE_KEY = 'photobooth-cam-id'

const showConsents = ref(false)
const consentsAccepted = ref(false)

function refreshConsentsAccepted() {
  const value = global.value.storeValue('consents_accepted')
  consentsAccepted.value = value != null && value !== ''
}

function openConsents() {
  showConsents.value = true
}

function getStoredCamId() {
  return localStorage.getItem(CAM_STORAGE_KEY)
}

function findDevice(deviceId) {
  return videoDevices.value.find((device) => device.deviceId === deviceId)
}

function resolveInitialCamId() {
  const stored = getStoredCamId()

  if (stored && findDevice(stored)) {
    return { deviceId: stored, fromStorage: true, storedValue: stored }
  }

  if (stored) {
    console.log('[cam] valore in localStorage non trovato tra i device:', stored)
  }

  if (videoDevices.value.length > 0) {
    return {
      deviceId: videoDevices.value[0].deviceId,
      fromStorage: false,
      storedValue: stored,
    }
  }

  return null
}

async function selectCamera(deviceId, { source = 'code', fromStorage = false } = {}) {
  const device = findDevice(deviceId)
  if (!device) {
    console.log('[cam] device non valido:', deviceId)
    return
  }

  const storedBefore = getStoredCamId()
  const index = videoDevices.value.indexOf(device)

  selectedDevice.value = deviceId
  localStorage.setItem(CAM_STORAGE_KEY, deviceId)

  console.log('[cam] fotocamera selezionata:', {
    deviceId,
    label: deviceLabel(device, index),
    source,
    storedInLocalStorageBefore: storedBefore,
    restoredFromStorage: fromStorage,
  })

  stopCamera()
  await startCamera()
}

onMounted(async () => {
  if (!global.value.features.camera) {
    router.push('/')
    return
  }
  if (!global.value.validateLimitUser() || !global.value.validateLimitTotal()) {
    return
  }
  refreshConsentsAccepted()
  if (!consentsAccepted.value) {
    showConsents.value = true
  }
  await getVideoDevices()

  const initial = resolveInitialCamId()
  if (initial) {
    await selectCamera(initial.deviceId, {
      source: initial.fromStorage ? 'localStorage' : 'default',
      fromStorage: initial.fromStorage,
    })
  }
})

onUnmounted(() => {
  stopCamera()
})

async function getVideoDevices() {
  try {
    const permission = await navigator.mediaDevices.getUserMedia({ video: true })
    const devices = await navigator.mediaDevices.enumerateDevices()
    videoDevices.value = devices.filter((device) => device.kind === 'videoinput')
    permission.getTracks().forEach((track) => track.stop())
  } catch (error) {
    console.error('Error getting video devices:', error)
  }
}

async function startCamera() {
  if (!selectedDevice.value) return

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: selectedDevice.value ? { exact: selectedDevice.value } : undefined,
      },
    })

    if (video.value) {
      video.value.srcObject = stream
      await video.value.play()
    }
  } catch (error) {
    console.error('Error accessing camera:', error)
  }
}

function stopCamera() {
  if (video.value?.srcObject) {
    video.value.srcObject.getTracks().forEach((track) => track.stop())
    video.value.srcObject = null
  }
}

async function onCameraSelectChange() {
  await selectCamera(selectedDevice.value, { source: 'select' })
}

function deviceLabel(device, index) {
  return device.label || `Fotocamera ${index + 1}`
}

async function shotPrepare() {
  if (isUploading.value || !consentsAccepted.value) return

  countDown.value = global.value.isDebug() ? 1 : global.value.countDownSeconds
  const interval = setInterval(() => {
    countDown.value -= 1
    if (countDown.value === 0) {
      clearInterval(interval)
      if (shotOverlay.value) {
        shotOverlay.value.style.opacity = '1'
        setTimeout(() => {
          if (shotOverlay.value) shotOverlay.value.style.opacity = '0'
        }, 300)
      }
      shot()
    }
  }, 1000)
}

async function shot() {
  if (!global.value.isDebug()) sound1.play()
  if (!video.value) return

  const imageId = `${Date.now()}`
  const imageExtension = 'jpg'

  if (!canvas.value) {
    canvas.value = document.createElement('canvas')
  }

  canvas.value.width = video.value.videoWidth
  canvas.value.height = video.value.videoHeight

  const ctx = canvas.value.getContext('2d')
  ctx.drawImage(video.value, 0, 0, canvas.value.width, canvas.value.height)
  image.value = canvas.value.toDataURL(`image/${imageExtension}`)

  if (global.value.isDebug()) {
    const link = document.createElement('a')
    link.download = `${imageId}.${imageExtension}`
    link.href = image.value
    link.click()
  }

  try {
    isUploading.value = true
    global.value.isLoading = true
    const result = await uploadImage(image.value, imageId)
    if (result) {
      await getResult(global.value.docId)
      router.push(`/detail/${global.value.docId}`)
    }
  } catch (error) {
    console.error('Error processing image:', error)
  } finally {
    isUploading.value = false
    global.value.isLoading = false
  }
}
</script>

<template>
  <section class="cam-page relative flex flex-1 flex-col items-center justify-center px-4 py-8 md:py-10">
    <div
      ref="shotOverlay"
      class="shot-overlay pointer-events-none absolute inset-0 z-20 bg-white"
      aria-hidden="true"
    />

    <div
      v-if="countDown > 0"
      class="absolute inset-0 z-30 flex items-center justify-center text-[#FF7230] text-[40vw] font-bold opacity-80 sm:text-[20vw]"
      aria-live="polite"
    >
      {{ countDown }}
    </div>

    <div class="relative z-10 flex w-full max-w-lg flex-col items-center gap-6 md:gap-8">
      <div
        class="cam-frame relative w-full max-w-[483px] bg-white shadow-[0px_18px_13px_-14px_rgba(0,0,0,0.05),0px_30px_20px_-20px_rgba(0,0,0,0.05)]"
        style="aspect-ratio: 483 / 627"
      >
        <div class="cam-viewport absolute bg-black">
          <video
            ref="video"
            class="cam h-full w-full object-cover"
            autoplay
            playsinline
            muted
          />
        </div>
      </div>

      <div
        v-if="videoDevices.length > 1"
        class="cam-select-field w-full max-w-md"
      >
        <label for="cam-device" class="cam-select-label">
          Fotocamera
        </label>
        <div class="cam-select-wrap">
          <select
            id="cam-device"
            v-model="selectedDevice"
            class="cam-select"
            :disabled="isUploading"
            @change="onCameraSelectChange"
          >
            <option
              v-for="(device, index) in videoDevices"
              :key="device.deviceId"
              :value="device.deviceId"
            >
              {{ deviceLabel(device, index) }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-5">
        <router-link
          to="/posters"
          class="btn-btl-secondary cursor-pointer"
          :class="{ 'pointer-events-none opacity-50': isUploading }"
        >
          Torna indietro
        </router-link>
        <button
          type="button"
          class="btn-btl-primary cursor-pointer"
          :disabled="isUploading || !selectedDevice || !consentsAccepted"
          @click="shotPrepare"
        >
          {{ isUploading ? 'Caricamento...' : 'Scatta' }}
        </button>
      </div>

      <button
        type="button"
        class=" text-neutral-600 underline underline-offset-2 hover:text-neutral-900 cursor-pointer"
        @click="openConsents"
      >
        Informativa privacy
      </button>
    </div>

    <Consents v-model:open="showConsents" @accepted="refreshConsentsAccepted" />
  </section>
</template>

<style scoped>
.cam-viewport {
  top: 5.58%;
  left: 7.04%;
  width: 86.13%;
  height: 82.78%;
}

.cam {
  transform: scaleX(-1);
}

.shot-overlay {
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
}

.cam-select-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cam-select-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.cam-select-wrap {
  position: relative;
}

.cam-select-wrap::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 1rem;
  width: 0.5rem;
  height: 0.5rem;
  pointer-events: none;
  border-right: 2px solid var(--text-primary);
  border-bottom: 2px solid var(--text-primary);
  transform: translateY(-65%) rotate(45deg);
}

.cam-select {
  width: 100%;
  appearance: none;
  border: 1px solid #d4d4d4;
  border-radius: 0;
  background-color: #fff;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.4;
  padding: 0.875rem 2.75rem 0.875rem 1rem;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.cam-select:hover:not(:disabled) {
  border-color: #a3a3a3;
}

.cam-select:focus {
  outline: none;
  border-color: var(--btn-primary-color);
  box-shadow: 0 0 0 3px rgba(255, 114, 48, 0.2);
}

.cam-select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background-color: #f5f5f5;
}
</style>
