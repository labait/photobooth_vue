<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'

const global = inject('global')

const maxItems = 50
const images = ref([])
const loaded = ref(false)

const loadingMessage = computed(() => {
  const value = global.value.isLoading
  return typeof value === 'string' ? value : ''
})

onMounted(async () => {
  try {
    const response = await fetch('/.netlify/functions/list')
    const data = await response.json()
    if (!data?.length) return

    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[data[i], data[j]] = [data[j], data[i]]
    }

    const sample = data.slice(0, maxItems)
    images.value = sample.map((item) => item.image_processed).filter(Boolean)
  } catch (e) {
    console.error('Errore nel caricamento delle immagini di anteprima', e)
  } finally {
    loaded.value = true
  }
})
</script>

<template>
  <div
    class="loading-overlay flex flex-col items-center justify-center overflow-hidden"
    role="status"
    aria-live="polite"
    :aria-label="loadingMessage || 'Caricamento in corso'"
  >
    <div v-if="loaded && images.length" class="slideshow-track mb-12 flex items-center gap-4">
      <div
        v-for="(src, index) in [...images, ...images]"
        :key="index"
        class="slide aspect-[2/3] w-40 flex-shrink-0 overflow-hidden rounded-lg border border-white/20 sm:w-52"
      >
        <img
          :src="src"
          class="h-full w-full object-cover"
          @error="$event.target.parentElement?.remove()"
        >
      </div>
    </div>

    <div class="loading-spinner" aria-hidden="true" />

    <p
      v-if="loadingMessage"
      class="loading-message mt-8 max-w-lg px-6 text-center text-base font-semibold leading-relaxed text-white sm:text-lg"
    >
      {{ loadingMessage }}
    </p>
  </div>
</template>

<style scoped>
.slideshow-track {
  width: max-content;
  animation: scroll-loop 30s linear infinite;
}

@keyframes scroll-loop {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(0 0 0 / 0.94);
}

.loading-spinner {
  width: 5rem;
  height: 5rem;
  border-radius: 9999px;
  border: 6px solid rgb(255 255 255 / 0.18);
  border-top-color: #fff;
  border-right-color: #fff;
  border-bottom-color: #fff;
  animation: loading-spin 0.85s linear infinite;
}

@media (min-width: 640px) {
  .loading-spinner {
    width: 5.5rem;
    height: 5.5rem;
    border-width: 7px;
  }
}

@keyframes loading-spin {
  to { transform: rotate(360deg); }
}

.loading-message {
  text-wrap: balance;
}
</style>
