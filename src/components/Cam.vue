<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { CameraIcon } from '@heroicons/vue/24/outline'

import Consents from './Consents.vue'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const global = inject('global')
const { waitForAuth } = useAuth()

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
const countdownTimer = ref(null)

const isCaptureActive = computed(() => countDown.value > 0 || isUploading.value)

const showConsents = ref(false)
const consentsAccepted = ref(false)

function refreshConsentsAccepted() {
  const value = global.value.storeValue('consents_accepted')
  consentsAccepted.value = value != null && value !== ''
}

function openConsents() {
  showConsents.value = true
}

function hasSelectedEditionImage() {
  return Boolean(global.value.edition_image?.file_path)
}

function showMissingEditionImageDialog() {
  global.value.dialog = {
    title: 'Errore',
    text: 'È necessario scegliere un\'immagine di riferimento',
    confirmText: 'OK',
    onConfirm: () => {
      global.value.dialog = {}
      router.push('/posters')
    },
  }
}

function getStoredCamId() {
  return global.value.storeValue('cam_id')
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
  global.value.storeValue('cam_id', deviceId)

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
  await waitForAuth()
  if (!global.value.validateLimits()) {
    return
  }
  if (!hasSelectedEditionImage()) {
    showMissingEditionImageDialog()
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
  clearCountdownTimer()
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

function clearCountdownTimer() {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }
}

function cancelCapture() {
  clearCountdownTimer()
  countDown.value = 0
  global.value.cancelGeneration()
  isUploading.value = false
}

async function shotPrepare() {
  if (!hasSelectedEditionImage()) {
    showMissingEditionImageDialog()
    return
  }
  if (isUploading.value || !consentsAccepted.value || countDown.value > 0) return

  global.value.resetGenerationCancellation()
  countDown.value = global.value.isDebug() ? 1 : global.value.countDownSeconds
  clearCountdownTimer()
  countdownTimer.value = setInterval(() => {
    countDown.value -= 1
    if (countDown.value === 0) {
      clearCountdownTimer()
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
  if (global.value.generationCancelled) return
  if (!global.value.validateLimits()) return

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
    const result = await uploadImage(image.value, imageId)
    if (global.value.generationCancelled) return

    if (result) {
      const data = await getResult(global.value.docId)
      if (global.value.generationCancelled) return

      if (data?.process_result?.status === 'succeeded') {
        router.push(`/detail/${global.value.docId}`)
      }
    }
  } catch (error) {
    if (!global.value.generationCancelled) {
      console.error('Error processing image:', error)
    }
  } finally {
    isUploading.value = false
    if (!global.value.generationCancelled) {
      global.value.stopGenerationProgress()
      global.value.isLoading = null
    }
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
      class="countdown-overlay"
      aria-live="polite"
    >
      <span class="countdown-number">{{ countDown }}</span>
    </div>

    <div class="relative z-10 flex w-full max-w-lg flex-col items-center gap-5 md:gap-6">
      <div
        v-if="videoDevices.length > 1"
        class="cam-select-field w-full max-w-[483px]"
      >
        <label for="cam-device" class="cam-select-label">
          Fotocamera
        </label>
        <div class="cam-select-wrap">
          <select
            id="cam-device"
            v-model="selectedDevice"
            class="cam-select"
            :disabled="isCaptureActive"
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

      <div
        class="cam-frame relative w-full max-w-[483px] bg-white shadow-[0px_18px_13px_-14px_rgba(0,0,0,0.05),0px_30px_20px_-20px_rgba(0,0,0,0.05)]"
        :class="{ 'cam-frame--capture': isCaptureActive }"
      >
        <div class="cam-viewport bg-black">
          <video
            ref="video"
            class="cam h-full w-full object-cover"
            autoplay
            playsinline
            muted
          />
        </div>

        <div class="cam-frame-actions">
          <button
            v-if="!isCaptureActive"
            type="button"
            class="btn-btl-primary cam-shot-btn cursor-pointer inline-flex items-center justify-center gap-3"
            :disabled="!selectedDevice || !consentsAccepted"
            @click="shotPrepare"
          >
            <CameraIcon class="h-6 w-6 shrink-0 sm:h-7 sm:w-7" aria-hidden="true" />
            Scatta
          </button>

          <button
            v-else
            type="button"
            class="cam-cancel-btn cursor-pointer"
            @click="cancelCapture"
          >
            Annulla
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-5">
        <router-link
          to="/posters"
          class="btn-btl-secondary cursor-pointer"
          :class="{ 'pointer-events-none opacity-50': isCaptureActive }"
        >
          Torna indietro
        </router-link>
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
.cam-frame {
  display: flex;
  flex-direction: column;
  padding: 5.58% 7.04% 3.5%;
  gap: 0.75rem;
}

.cam-viewport {
  width: 100%;
  aspect-ratio: 416 / 519;
  overflow: hidden;
}

.cam-frame-actions {
  display: flex;
  justify-content: center;
}

.cam-frame--capture {
  z-index: 35;
}

.cam {
  transform: scaleX(-1);
}

.shot-overlay {
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
}

.countdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.countdown-number {
  color: #ff7230;
  font-size: clamp(7rem, 52vw, 24rem);
  font-weight: 700;
  line-height: 1;
  opacity: 0.85;
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

.cam-shot-btn,
.cam-cancel-btn {
  width: 100%;
  padding: 0.875rem 1.25rem;
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.2;
  min-height: 3rem;
}

.cam-cancel-btn {
  border: 1px solid #d4d4d4;
  border-radius: 0;
  background-color: #e5e5e5;
  color: #525252;
  transition: background-color 0.2s ease;
}

.cam-cancel-btn:hover {
  background-color: #d4d4d4;
}

@media (min-width: 640px) {
  .cam-shot-btn,
  .cam-cancel-btn {
    padding: 1rem 1.5rem;
    font-size: 1.25rem;
    min-height: 3.25rem;
  }
}
</style>
