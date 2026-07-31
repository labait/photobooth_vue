<script setup>
import { ref, inject, watch, nextTick, onUnmounted } from 'vue'

const open = defineModel('open', { type: Boolean, default: false })

const emit = defineEmits(['accepted'])

const global = inject('global')

const iframeRef = ref(null)
const canAccept = ref(false)

function hasAccepted() {
  const value = global.value.storeValue('consents_accepted')
  return value != null && value !== ''
}

function consentTimestamp() {
  const date = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function checkScroll() {
  const win = iframeRef.value?.contentWindow
  const doc = iframeRef.value?.contentDocument
  if (!win || !doc) return

  const el = doc.documentElement
  const scrollTop = win.scrollY ?? Math.max(el.scrollTop, doc.body.scrollTop)
  const clientHeight = win.innerHeight ?? el.clientHeight
  const scrollHeight = Math.max(el.scrollHeight, doc.body.scrollHeight)

  if (scrollHeight <= clientHeight + 2) {
    canAccept.value = true
    return
  }

  canAccept.value = scrollTop + clientHeight >= scrollHeight - 12
}

function bindIframeScroll() {
  const win = iframeRef.value?.contentWindow
  if (!win) return

  win.removeEventListener('scroll', checkScroll)
  win.addEventListener('scroll', checkScroll, { passive: true })
  checkScroll()
}

function onIframeLoad() {
  canAccept.value = false
  nextTick(bindIframeScroll)
}

function accept() {
  global.value.storeValue('consents_accepted', consentTimestamp())
  open.value = false
  emit('accepted')
}

function close() {
  open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    canAccept.value = false
    nextTick(bindIframeScroll)
  }
})

onUnmounted(() => {
  iframeRef.value?.contentWindow?.removeEventListener('scroll', checkScroll)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consents-title"
    >
      <div class="absolute inset-0 bg-black/50" aria-hidden="true" />

      <div
        class="relative flex h-[96vh] sm:h-[600px] sm:max-h-[90vh] w-full sm:max-w-3xl flex-col bg-white shadow-xl"
        @click.stop
      >
        <div class="shrink-0 border-b border-neutral-200 px-4 py-2 sm:px-6">
          <h2 id="consents-title" class="text-base font-bold text-neutral-900 sm:text-lg">
            Informativa privacy
          </h2>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden">
          <iframe
            ref="iframeRef"
            src="/informativa.html"
            title="Informativa privacy"
            class="h-full w-full border-0"
            @load="onIframeLoad"
          />
        </div>

        <div class="shrink-0 border-t border-neutral-200 px-4 py-3 sm:px-6 flex justify-center">
          <button
            v-if="hasAccepted()"
            type="button"
            class="btn-btl-secondary cursor-pointer sm:min-w-[140px]"
            @click="close"
          >
            Chiudi
          </button>
          <button
            v-else
            type="button"
            class="btn-btl-primary cursor-pointer sm:min-w-[140px] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canAccept"
            @click="accept"
          >
            Accetto
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
