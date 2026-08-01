<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ClipboardDocumentIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import QrcodeVue from 'qrcode.vue'

const props = defineProps({
  url: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['close'])

const qrWrapRef = ref(null)
const qrSize = ref(240)
const copyLabel = ref('Copia link')

function updateQrSize() {
  const wrap = qrWrapRef.value
  if (!wrap) return

  const maxSide = Math.min(
    wrap.clientWidth,
    wrap.clientHeight,
    window.innerWidth - 48,
    window.innerHeight - 140,
  )

  if (maxSide <= 0) return

  qrSize.value = Math.max(160, Math.floor(maxSide))
}

function close() {
  emit('close')
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(props.url)
    copyLabel.value = 'Copiato!'
    return
  } catch {
    // fallback below
  }

  try {
    const input = document.createElement('textarea')
    input.value = props.url
    input.setAttribute('readonly', '')
    input.style.position = 'absolute'
    input.style.left = '-9999px'
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copyLabel.value = 'Copiato!'
  } catch {
    window.prompt('Copia il link:', props.url)
  }

  setTimeout(() => {
    copyLabel.value = 'Copia link'
  }, 2000)
}

let resizeObserver

onMounted(async () => {
  await nextTick()
  updateQrSize()

  if (qrWrapRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(updateQrSize)
    resizeObserver.observe(qrWrapRef.value)
  }

  window.addEventListener('resize', updateQrSize)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', updateQrSize)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="qr-overlay fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Codice QR"
    >
      <div
        class="absolute inset-0 bg-black/60"
        aria-hidden="true"
        @click="close"
      />

      <div
        class="qr-panel relative flex w-full flex-col"
        @click.stop
      >
        <button
          type="button"
          class="qr-dismiss-btn absolute right-2 top-2 z-10 cursor-pointer"
          aria-label="Chiudi"
          @click="close"
        >
          <XMarkIcon class="h-12 w-12" aria-hidden="true" />
        </button>

        <div
          ref="qrWrapRef"
          class="qr-code-wrap"
        >
          <QrcodeVue
            :value="url"
            :size="qrSize"
            level="H"
            class="qr-code"
          />
        </div>

        <div class="qr-url-row flex w-full min-w-0 shrink-0 items-center gap-2">
          <button
            type="button"
            class="qr-copy-btn shrink-0 cursor-pointer"
            :aria-label="copyLabel"
            @click="copyUrl"
          >
            <ClipboardDocumentIcon class="h-5 w-5" aria-hidden="true" />
          </button>
          <p class="min-w-0 flex-1 truncate text-sm text-neutral-600" :title="url">
            {{ url }}
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.qr-panel {
  width: min(96vw, 40rem);
  height: min(calc(100dvh - 1.5rem), calc(100vh - 1.5rem));
  max-height: calc(100dvh - 1.5rem);
  overflow: hidden;
  border-radius: 1rem;
  background: #fff;
  padding: clamp(0.875rem, 2.5vw, 1.25rem);
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.2);
}

.qr-code-wrap {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.qr-code {
  max-width: 100%;
  max-height: 100%;
}

.qr-code :deep(canvas),
.qr-code :deep(svg) {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto !important;
  height: auto !important;
}

.qr-url-row {
  margin-top: 0.875rem;
}

.qr-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #d4d4d4;
  border-radius: 0.375rem;
  background: #fff;
  color: var(--text-primary);
  transition: background-color 0.2s ease;
}

.qr-copy-btn:hover {
  background: #f5f5f5;
}

.qr-dismiss-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: #525252;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.qr-dismiss-btn:hover {
  background: rgb(0 0 0 / 0.06);
  color: #201c28;
}
</style>
