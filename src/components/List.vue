<script setup>
import { ref, inject, onMounted } from 'vue'

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

    // tieni solo gli item che hanno davvero un'immagine processata
    const withProcessed = data.filter(item => !!item.image_processed)
    const sample = withProcessed.slice(0, maxItems)
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
  <div class="loading-overlay">

    <!-- Slideshow scorrevole -->
    <div v-if="loaded && images.length" class="slideshow-wrap">
      <div class="slideshow-track">
        <div
          v-for="(src, index) in [...images, ...images]"
          :key="index"
          class="slide"
        >
          <img :src="src" />
        </div>
      </div>
    </div>

    <!-- Spinner -->
    <div class="spinner"></div>

  </div>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  max-height: 100vh;
  z-index: 50;
  background: #000;
  opacity: 0.95;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.slideshow-wrap {
  width: 100%;
  overflow: hidden;
  margin-bottom: 48px;
}

.slideshow-track {
  display: flex;
  align-items: center;
  gap: 16px;
  width: max-content;
  animation: scroll-loop 30s linear infinite;
}

.slide {
  flex: 0 0 auto;
  width: 130px;
  height: 195px; /* rapporto 2:3 fissato in px, non dipende da Tailwind */
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

@media (min-width: 640px) {
  .slide {
    width: 160px;
    height: 240px;
  }
}

@media (min-width: 1024px) {
  .slide {
    width: 180px;
    height: 270px;
  }
}

@keyframes scroll-loop {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.spinner {
  width: 96px;
  height: 96px;
  border-top: 8px solid #fff;
  border-bottom: 8px solid #fff;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>