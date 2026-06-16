<script setup>
import { ref, inject, onMounted, onUnmounted } from 'vue'

const getStorageUrl = inject('getStorageUrl')

const maxItems = 10
const images = ref([])
const loaded = ref(false)

onMounted(async () => {
  try {
    const response = await fetch('/.netlify/functions/list')
    const data = await response.json()
    if (!data?.length) return

    // Fisher-Yates shuffle
    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[data[i], data[j]] = [data[j], data[i]]
    }

    const sample = data.slice(0, maxItems)
    images.value = await Promise.all(
      sample.map(item => getStorageUrl(item.image_processed))
    )
  } catch (e) {
    console.error('Errore nel caricamento delle immagini di anteprima', e)
  } finally {
    loaded.value = true
  }
})
</script>

<template>
  <div class="loading-overlay flex flex-col justify-center items-center h-screen opacity-95 absolute top-0 left-0 w-full z-50 bg-black overflow-hidden">

    <!-- Slideshow scorrevole -->
    <div v-if="loaded && images.length" class="slideshow-track flex items-center gap-4 mb-12">
      <div
        v-for="(src, index) in [...images, ...images]"
        :key="index"
        class="slide flex-shrink-0 w-40 sm:w-52 aspect-[2/3] rounded-lg overflow-hidden border border-white/20"
      >
        <img :src="src" class="w-full h-full object-cover" />
      </div>
    </div>

    <!-- Spinner -->
    <div class="w-32 h-32 border-t-8 border-b-8 border-white rounded-full animate-spin"></div>

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
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 50;
  background: #000;
  opacity: 0.95;
  overflow: hidden;
}
</style>