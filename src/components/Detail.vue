<script setup>
import { ref, computed, onMounted, inject, nextTick } from 'vue'
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router'
import {
  ShareIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  QrCodeIcon,
} from '@heroicons/vue/24/outline'

import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { canViewDetail, ITEM_STATUS } from '../itemStorage.js'
import { useAuth } from '../composables/useAuth'
import QrCode from './QrCode.vue'

const route = useRoute()
const router = useRouter()
const docId = ref(route.params.docId)

const global = inject('global')
const getResult = inject('getResult')
const getStorageUrl = inject('getStorageUrl')
const detailUrl = inject('detailUrl')
const { isAdmin, waitForAuth } = useAuth()

const showFramed = ref(true)
const showQrCode = ref(false)
const printImageRef = ref(null)

const pageShareUrl = computed(() => detailUrl(docId.value))

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


const shareableImageUrl = computed(() => {
  return global.value.docData?.image_framed
    || global.value.docData?.image_processed
    || null
})

const framedDownloadUrl = computed(() => global.value.docData?.image_framed || null)

const downloadFileName = computed(() => `photobooth-${docId.value}.png`)

const shareDisabled = computed(() => !shareableImageUrl.value)
const downloadDisabled = computed(() => !framedDownloadUrl.value)

const awaitingPublication = computed(
  () => global.value.docData?.status === ITEM_STATUS.PROCESSED,
)

const showShareActions = computed(() => {
  if (awaitingPublication.value) return false
  return global.value.docData?.status === ITEM_STATUS.ACCEPTED || isAdmin.value
})

function showUnavailableDialog() {
  global.value.dialog = {
    title: 'Errore',
    text: 'Immagine non disponibile',
    confirmText: 'OK',
    onConfirm: () => {
      global.value.dialog = {}
      router.push('/')
    },
  }
}

const loadData = async () => {
  await waitForAuth()

  const docRef = doc(db, 'items', docId.value)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    showUnavailableDialog()
    return
  }

  global.value.docData = snapshot.data()

  if (!canViewDetail(global.value.docData?.status, { isAdmin: isAdmin.value })) {
    showUnavailableDialog()
    return
  }

  const isGenerationComplete = Boolean(
    global.value.docData?.image_processed
    || global.value.docData?.status === ITEM_STATUS.PROCESSED
    || global.value.docData?.status === ITEM_STATUS.ACCEPTED,
  )

  if (!isGenerationComplete) {
    global.value.startGenerationProgress()
    await getResult(docId.value)
  }

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

async function onDownloadClick(event) {
  const url = framedDownloadUrl.value
  if (!url) {
    event.preventDefault()
    return
  }

  event.preventDefault()

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Download failed')

    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = downloadFileName.value
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('Download error:', error)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadFileName.value
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}

function print() {
  window.print()
}

async function updatePublicationStatus(status) {
  const docRef = doc(db, 'items', docId.value)
  await updateDoc(docRef, { status })
  global.value.docData = {
    ...global.value.docData,
    status,
  }
}

function showRejectPublicationDialog() {
  global.value.dialog = {
    title: 'Rifiuta pubblicazione',
    text: 'Confermi di non voler pubblicare l\'immagine generata?',
    cancelText: 'Annulla',
    confirmText: 'OK',
    onCancel: () => {
      global.value.dialog = {}
    },
    onConfirm: async () => {
      global.value.dialog = {}
      await updatePublicationStatus(ITEM_STATUS.NOT_ACCEPTED)
      global.value.dialog = {
        title: 'Pubblicazione annullata',
        text: 'L\'immagine non sarà visibile nella raccolta pubblica.',
        confirmText: 'OK',
        onConfirm: () => {
          global.value.dialog = {}
          router.push('/')
        },
      }
    },
  }
}

function showAcceptPublicationDialog() {
  global.value.dialog = {
    title: 'Conferma pubblicazione',
    text: 'Confermi la pubblicazione dell\'immagine generata?',
    cancelText: 'Annulla',
    confirmText: 'OK',
    onCancel: () => {
      global.value.dialog = {}
    },
    onConfirm: async () => {
      global.value.dialog = {}
      await updatePublicationStatus(ITEM_STATUS.ACCEPTED)
    },
  }
}

function triggerAutoPrint() {
  const img = printImageRef.value
  if (!img) {
    print()
    return
  }

  if (img.complete) {
    print()
    return
  }

  img.addEventListener('load', print, { once: true })
  img.addEventListener('error', print, { once: true })
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
  if (route.query.print != null) return true
  if (awaitingPublication.value) return confirmLeavePage()
  return true
})

onMounted(async () => {
  await loadData()

  if (route.query.print != null) {
    await nextTick()
    triggerAutoPrint()
  }
})
</script>

<template>
  <div class="relative flex min-h-[calc(100vh-8rem)] w-full flex-col items-center px-4 py-6 print:m-0 print:min-h-0 print:p-0">
    <template v-if="global.docData">
      <div
        class="w-full max-w-2xl print:m-0 print:w-full print:max-w-full print:p-0"
        :class="{ 'cursor-pointer': canToggle }"
        @click="toggleImage"
      >
        <p
          v-if="canToggle"
          class="mb-3.5 text-center font-medium text-[#201c28]/65 print:hidden"
        >
         
          Ricordati di <strong>confermare la pubblicazione</strong> dell'immagine generata utilizzando i pulsanti in basso.
        </p>

        <div class="text-center  font-medium text-[#201c28]/65 print:hidden">
          
        </div>

        <img
          v-if="currentImageUrl"
          :src="currentImageUrl"
          alt="Anteprima photobooth"
          class="block h-auto w-full print:hidden"
        >
        <img
          v-if="generatedImageUrl"
          ref="printImageRef"
          :src="generatedImageUrl"
          alt=""
          aria-hidden="true"
          class="hidden h-auto w-full print:block print:max-h-screen print:max-w-full print:object-contain print:break-inside-avoid"
        >
        <div
          v-else-if="!currentImageUrl"
          class="flex min-h-80 flex-col items-center justify-center rounded-lg bg-black/6 p-8 text-[var(--text-primary)] print:hidden"
        >
          <p class="text-center text-lg font-bold">Elaborazione in corso</p>
          <p class="mt-2 text-center opacity-70">fai refresh o attendi qualche secondo...</p>
        </div>
      </div>

      <div
        v-if="awaitingPublication"
        class="mx-auto mt-5 flex w-full max-w-2xl flex-nowrap items-center justify-center gap-3 print:hidden"
      >
        <button
          type="button"
          class="cursor-pointer inline-flex flex-1 items-center justify-center rounded-lg border-0 bg-[var(--btn-secondary-bg)] px-6 py-3.5 text-base font-semibold leading-tight whitespace-nowrap text-[var(--btn-secondary-text)] transition-[filter] hover:brightness-95"
          @click="showRejectPublicationDialog"
        >
          Rifiuta
        </button>
        <button
          type="button"
          class="cursor-pointer inline-flex flex-1 items-center justify-center rounded-lg border-0 bg-[var(--btn-primary-color)] px-6 py-3.5 text-base font-semibold leading-tight whitespace-nowrap text-white transition-[filter] hover:brightness-95"
          @click="showAcceptPublicationDialog"
        >
          Conferma pubblicazione
        </button>
      </div>

      <div
        v-else-if="showShareActions"
        class="mx-auto mt-5 flex w-full max-w-2xl flex-nowrap items-center justify-center gap-3 print:hidden"
      >
        <button
          type="button"
          class="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-lg border-0 bg-[var(--btn-primary-color)] px-5 py-3 text-base font-medium leading-tight whitespace-nowrap text-white no-underline transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="shareDisabled"
          @click="shareImage"
        >
          <ShareIcon class="h-5 w-5 shrink-0" aria-hidden="true" />
          Condividi
        </button>
        <a
          :href="framedDownloadUrl || undefined"
          :download="downloadFileName"
          class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border-0 bg-[var(--btn-primary-color)] p-3 text-white no-underline transition-[filter] hover:brightness-95"
          :class="downloadDisabled ? 'pointer-events-none cursor-not-allowed opacity-50' : ''"
          :aria-disabled="downloadDisabled ? 'true' : undefined"
          aria-label="Scarica"
          @click="onDownloadClick"
        >
          <ArrowDownTrayIcon class="h-5 w-5 shrink-0" aria-hidden="true" />
        </a>
        <button
          type="button"
          class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border-0 bg-[var(--btn-primary-color)] p-3 text-white transition-[filter] hover:brightness-95"
          aria-label="Mostra codice QR"
          @click="showQrCode = true"
        >
          <QrCodeIcon class="h-5 w-5 shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border-0 bg-[var(--btn-primary-color)] p-3 text-white transition-[filter] hover:brightness-95"
          aria-label="Stampa"
          @click="print"
        >
          <PrinterIcon class="h-5 w-5 shrink-0" aria-hidden="true" />
        </button>
      </div>

      <div class="mt-4 text-center text-gray-300 font-medium print:hidden">
        Tocca per alternare l'originale e l'immagine generata
      </div>

      <QrCode
        v-if="showQrCode"
        :url="pageShareUrl"
        @close="showQrCode = false"
      />
      
    </template>
  </div>
</template>
