<script setup>
import { ref, onMounted, inject } from 'vue'
import Polaroid from './Polaroid.vue'

const detailUrl = inject('detailUrl')
const global = inject('global')
const getStorageUrl = inject('getStorageUrl')

const maxRotation = 12
const stagePadding = 120
const stageTopPadding = 40
const nextInterval = 226000
const items = ref([])
let nextTimeout
let currentItem
let currentPolaroid
let previousPolaroid

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

onMounted(async () => {
  global.value.isLoading = true
  try {
    const response = await fetch('/.netlify/functions/list')
    const data = await response.json()
    if (!response.ok || data?.error) {
      console.error('Errore caricamento list:', data?.error || response.status)
      return
    }
    if (!data?.length) return

    shuffleArray(data)
    items.value = data

    items.value = await Promise.all(items.value.map(async (item) => ({
      ...item,
      image_source: await getStorageUrl(item.image_source),
      image_processed: await getStorageUrl(item.image_processed),
    })))
    items.value = items.value.filter(
      (item) => item.image_processed,
    )

    if (!items.value.length) return

    setTimeout(() => {
      setupPolaroids()
      const item = getRandomItem()
      showPolaroid(item.docId)
    }, 0)
  } catch (error) {
    console.error('Errore caricamento list:', error)
  } finally {
    global.value.isLoading = null
  }
})

const getRandomItem = () => {
  const randomIndex = Math.floor(Math.random() * items.value.length)
  return items.value[randomIndex]
}

const setupPolaroids = () => {
  const stage = document.querySelector('.polaroids-stage')
  if (!stage) return

  const stageWidth = stage.clientWidth - stagePadding
  const stageHeight = stage.clientHeight - stagePadding - stageTopPadding

  document.querySelectorAll('.polaroid').forEach((polaroid, index) => {
    const randomRotation = -maxRotation + Math.random() * maxRotation
    const randomLeft = -stageWidth / 2 + stageWidth * Math.random()
    const randomTop = stageTopPadding + (-stageHeight / 2 + stageHeight * Math.random())
    const transform = `translate(${randomLeft}px, ${randomTop}px) rotate(${randomRotation}deg) scale(0.5)`
    polaroid.style.zIndex = polaroid.style.zIndex_previous = 100 + index
    polaroid.style.transform = transform
    polaroid.style.transform_previous = transform
  })
}

const showPolaroid = (docId) => {
  currentItem = items.value.find((item) => item.docId === docId)
  currentPolaroid = document.getElementById(`item-${docId}`)
  if (currentPolaroid || currentPolaroid !== previousPolaroid) {
    hidePreviousPolaroid()
    currentPolaroid.style.transform = 'translate(0, 0) rotate(0deg) scale(1.1)'
    currentPolaroid.style.zIndex = 200
    currentPolaroid.classList.add('active')
    previousPolaroid = currentPolaroid
  }
  clearTimeout(nextTimeout)
  nextTimeout = setTimeout(() => {
    const item = getRandomItem()
    showPolaroid(item.docId)
  }, nextInterval)
}

const hidePreviousPolaroid = () => {
  if (previousPolaroid) {
    previousPolaroid.classList.remove('active')
    previousPolaroid.style.transform = previousPolaroid.style.transform_previous
    previousPolaroid.style.zIndex = previousPolaroid.style.zIndex_previous
  }
}

const clickPolaroid = (item) => {
  if (item !== currentItem) {
    currentItem = item
    showPolaroid(item.docId)
  } else {
    previousPolaroid = document.getElementById(`item-${item.docId}`)
    hidePreviousPolaroid()
  }
}

const openDetail = (item) => {
  window.location.href = detailUrl(item.docId)
}
</script>

<template>
  <div v-if="global.isLoading == null" class="list-page">
    <div class="polaroids-stage flex items-center justify-center">
      <Polaroid
      v-for="item in items"
      :id="`item-${item.docId}`"
      :key="item.docId"
      :data-image-id="item.image_id"
      class="polaroid"
    >
      <img
        :src="item.image_source"
        class="image-source absolute top-0 left-0 block h-full w-full cursor-pointer object-cover"
        @click="clickPolaroid(item)"
      >
      <img
        :src="item.image_processed"
        class="image-processed absolute top-0 left-0 block h-full w-full cursor-pointer object-cover"
        @click="clickPolaroid(item)"
      >
      <template #footer>
        <div class="mb-2 flex w-full justify-center gap-2 hover:underline">
          <button
            type="button"
            class="h-10 w-full cursor-pointer"
            @click="openDetail(item)"
          />
        </div>
      </template>
      </Polaroid>
    </div>
  </div>
</template>

<style scoped>
.list-page {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: visible;
}

.polaroids-stage {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.polaroid {
  position: absolute;
  transition: transform 0.3s ease;
  cursor: pointer;
  pointer-events: auto;
}

.image-processed {
  animation: anim_processed 3s ease infinite;
}

.image-source {
  transform: scaleX(-1);
}

@keyframes anim_processed {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@media only screen and (max-width: 768px) {
  .polaroids-stage {
    transform: scale(0.6);
    transform-origin: center center;
  }
}
</style>
