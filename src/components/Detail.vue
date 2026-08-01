<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import {
  ShareIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from '@heroicons/vue/24/outline'

import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const route = useRoute()
const docId = ref(route.params.docId)

const global = inject('global')
const getResult = inject('getResult')
const getStorageUrl = inject('getStorageUrl')

const showFramed = ref(true)

const framedImageUrl = computed(() => global.value.docData?.image_framed || null)

const generatedImageUrl = computed(() => {
  const data = global.value.docData
  if (!data) return null
  return data.image_framed || data.image_processed || null
})

const sourceImageUrl = computed(() => global.value.docData?.image_source || null)

const canToggle = computed(() => Boolean(generatedImageUrl.value && sourceImageUrl.value))

const currentImageUrl = computed(() => {
  if (showFramed.value) return generatedImageUrl.value
  return sourceImageUrl.value
})

const toggleHint = 'Tocca per alternare l\'originale e l\'immagine generata'

const shareableImageUrl = computed(() => {
  return global.value.docData?.image_framed
    || global.value.docData?.image_processed
    || null
})

const actionsDisabled = computed(() => !shareableImageUrl.value)

const loadData = async () => {
  const docRef = doc(db, 'items', docId.value)
  global.value.docData = (await getDoc(docRef)).data()

  if (!global.value.docData?.image_processed) {
    global.value.startGenerationProgress()
  }

  await getResult(docId.value)

  global.value.docData.image_source = await getStorageUrl(global.value.docData.image_source)
  global.value.docData.image_processed = await getStorageUrl(global.value.docData.image_processed)
  global.value.docData.image_framed = await getStorageUrl(global.value.docData.image_framed)

  showFramed.value = Boolean(generatedImageUrl.value)
  global.value.stopGenerationProgress()
  global.value.isLoading = null
}

function toggleImage() {
  if (!canToggle.value) return
  showFramed.value = !showFramed.value
}

async function shareImage() {
  const url = shareableImageUrl.value
  if (!url) return

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Photobooth LABA',
        text: 'La mia immagine dal photobooth',
        url,
      })
      return
    } catch (error) {
      if (error?.name === 'AbortError') return
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    alert('Link copiato negli appunti')
  } catch {
    window.prompt('Copia il link dell\'immagine:', url)
  }
}

async function downloadImage() {
  const url = framedImageUrl.value
  if (!url) return

  const response = await fetch(url)
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = `photobooth-${docId.value}.png`
  link.click()
  URL.revokeObjectURL(blobUrl)
}

function print() {
  window.print()
}

const LEAVE_DIALOG_TEXT = 'Stai per uscire da questa pagina. Se non hai salvato l\'immagine o l\'indirizzo, non sarà facile recuperare l\'immagine generata. Sei sicuro?'

function confirmLeavePage() {
  return new Promise((resolve) => {
    global.value.dialog = {
      title: 'Attenzione',
      text: LEAVE_DIALOG_TEXT,
      cancelText: 'Annulla',
      confirmText: 'OK',
      onCancel: () => {
        global.value.dialog = {}
        resolve(false)
      },
      onConfirm: () => {
        global.value.dialog = {}
        resolve(true)
      },
    }
  })
}

onBeforeRouteLeave(async () => {
  return confirmLeavePage()
})

onMounted(async () => {
  await loadData()
})
</script>

<template>
  <div class="detail-page relative flex w-full flex-col items-center px-4 py-6">
    <template v-if="global.docData">
      <div
        class="detail-image-shell print:py-16"
        :class="{ 'detail-image-shell--clickable': canToggle }"
        @click="toggleImage"
      >
        <p
          v-if="canToggle"
          class="detail-image-hint print:hidden"
        >
          {{ toggleHint }}
        </p>

        <img
          v-if="currentImageUrl"
          :src="currentImageUrl"
          alt="Anteprima photobooth"
          class="detail-image detail-image--interactive"
        >
        <img
          v-if="generatedImageUrl"
          :src="generatedImageUrl"
          alt=""
          aria-hidden="true"
          class="detail-image detail-image--print"
        >
        <div
          v-else-if="!currentImageUrl"
          class="detail-image-placeholder"
        >
          <p class="text-center text-lg font-bold">Elaborazione in corso</p>
          <p class="mt-2 text-center text-sm opacity-70">fai refresh o attendi qualche secondo...</p>
        </div>
      </div>

      <div class="detail-actions print:hidden">
        <button
          type="button"
          class="detail-action-btn"
          :disabled="actionsDisabled"
          @click="shareImage"
        >
          <ShareIcon class="detail-action-icon" aria-hidden="true" />
          Condividi
        </button>
        <button
          type="button"
          class="detail-action-btn"
          :disabled="actionsDisabled"
          @click="downloadImage"
        >
          <ArrowDownTrayIcon class="detail-action-icon" aria-hidden="true" />
          Scarica
        </button>
        <button
          type="button"
          class="detail-action-btn"
          @click="print"
        >
          <PrinterIcon class="detail-action-icon" aria-hidden="true" />
          Stampa
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: calc(100vh - 8rem);
}

.detail-image-shell {
  width: min(96vw, 42rem);
  max-width: 100%;
}

.detail-image-shell--clickable {
  cursor: pointer;
}

.detail-image {
  display: block;
  width: 100%;
  height: auto;
}

.detail-image--print {
  display: none;
}

.detail-image-placeholder {
  display: flex;
  min-height: 20rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: rgb(0 0 0 / 0.06);
  color: var(--text-primary);
  padding: 2rem;
}

.detail-image-hint {
  margin-bottom: 0.875rem;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(32 28 40 / 0.65);
}

.detail-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: min(96vw, 42rem);
  max-width: 100%;
  margin-top: 1.25rem;
}

.detail-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  width: auto;
  border: none;
  border-radius: 0.5rem;
  background-color: var(--btn-primary-color);
  color: #fff;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.25;
  padding: 0.75rem 1.25rem;
  white-space: nowrap;
  transition: filter 0.2s ease;
}

.detail-action-btn:hover:not(:disabled) {
  filter: brightness(0.95);
}

.detail-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.detail-action-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

@media print {
  .detail-image--interactive {
    display: none;
  }

  .detail-image--print {
    display: block;
  }
}
</style>
