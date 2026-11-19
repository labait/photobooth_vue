<script setup>
import { ref, onMounted, onUnmounted, inject, nextTick } from 'vue'
import Polaroid from './Polaroid.vue'
import { LIST_CYCLE_MS, LIST_ITEMS, LIST_REFRESH_MS } from '../composables/useFeatureAccess'

const detailUrl = inject('detailUrl')
const global = inject('global')
const getStorageUrl = inject('getStorageUrl')

const maxRotation = 12
const stagePadding = 120
const stageTopPadding = 40
const listCycleMs = LIST_CYCLE_MS
const items = ref([])
let nextTimeout
let refreshTimeout
let isUnmounted = false
// Id già ricevuti dalla function (anche se non mostrati o rimossi): evita di ri-aggiungerli
const seenIds = new Set()
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

async function fetchList() {
  const response = await fetch('/.netlify/functions/list')
  const data = await response.json()
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `HTTP ${response.status}`)
  }
  return Array.isArray(data) ? data : []
}

async function resolveItemUrls(list) {
  const resolved = await Promise.all(list.map(async (item) => ({
    ...item,
    image_source: await getStorageUrl(item.image_source),
    image_processed: await getStorageUrl(item.image_processed),
  })))
  return resolved.filter((item) => item.image_processed)
}

onMounted(async () => {
  global.value.isLoading = true
  try {
    const data = await fetchList()
    data.forEach((item) => seenIds.add(item.docId))
    shuffleArray(data)
    items.value = await resolveItemUrls(data.slice(0, LIST_ITEMS))
  } catch (error) {
    console.error('Errore caricamento list:', error)
  } finally {
    global.value.isLoading = null
  }

  if (items.value.length) {
    await nextTick()
    setupPolaroids()
    showPolaroid(getRandomItem().docId)
  }
  scheduleRefresh()
})

onUnmounted(() => {
  isUnmounted = true
  clearTimeout(nextTimeout)
  clearTimeout(refreshTimeout)
})

const scheduleRefresh = () => {
  if (!LIST_REFRESH_MS || isUnmounted) return
  clearTimeout(refreshTimeout)
  refreshTimeout = setTimeout(refreshItems, LIST_REFRESH_MS)
}

// Ricarica la lista e aggiunge solo gli elementi non ancora presenti
const refreshItems = async () => {
  try {
    const data = await fetchList()
    const fresh = data.filter((item) => !seenIds.has(item.docId))
    fresh.forEach((item) => seenIds.add(item.docId))
    const newItems = await resolveItemUrls(fresh)
    if (isUnmounted || !newItems.length) return

    const wasEmpty = !items.value.length
    items.value = [...items.value, ...newItems]
    trimItems()

    await nextTick()
    newItems.forEach((item) => {
      const el = document.getElementById(`item-${item.docId}`)
      if (el) placePolaroid(el, 100 + items.value.indexOf(item))
    })
    if (wasEmpty) showPolaroid(getRandomItem().docId)
  } catch (error) {
    console.error('Errore aggiornamento list:', error)
  } finally {
    scheduleRefresh()
  }
}

// Mantiene al massimo LIST_ITEMS elementi rimuovendo i più vecchi (mai quello in primo piano)
const trimItems = () => {
  const excess = items.value.length - LIST_ITEMS
  if (excess <= 0) return
  const toRemove = new Set(
    [...items.value]
      .filter((item) => item !== currentItem)
      .sort((a, b) => timestampMs(a) - timestampMs(b))
      .slice(0, excess)
      .map((item) => item.docId),
  )
  items.value = items.value.filter((item) => !toRemove.has(item.docId))
}

const timestampMs = (item) => {
  const ts = item.timestamp
  if (!ts) return 0
  if (typeof ts === 'number') return ts
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  if (typeof ts._seconds === 'number') return ts._seconds * 1000
  return 0
}

const getRandomItem = () => {
  const randomIndex = Math.floor(Math.random() * items.value.length)
  return items.value[randomIndex]
}

const placePolaroid = (polaroid, zIndex) => {
  const stage = document.querySelector('.polaroids-stage')
  if (!stage) return

  const stageWidth = stage.clientWidth - stagePadding
  const stageHeight = stage.clientHeight - stagePadding - stageTopPadding
  const randomRotation = -maxRotation + Math.random() * maxRotation
  const randomLeft = -stageWidth / 2 + stageWidth * Math.random()
  const randomTop = stageTopPadding + (-stageHeight / 2 + stageHeight * Math.random())
  const transform = `translate(${randomLeft}px, ${randomTop}px) rotate(${randomRotation}deg) scale(0.5)`
  polaroid.style.zIndex = polaroid.style.zIndex_previous = zIndex
  polaroid.style.transform = transform
  polaroid.style.transform_previous = transform
}

const setupPolaroids = () => {
  document.querySelectorAll('.polaroid').forEach((polaroid, index) => {
    placePolaroid(polaroid, 100 + index)
  })
}

const scheduleNextPolaroid = () => {
  clearTimeout(nextTimeout)
  nextTimeout = setTimeout(() => {
    showPolaroid(getRandomItem().docId)
  }, listCycleMs)
}

const showPolaroid = (docId) => {
  currentItem = items.value.find((item) => item.docId === docId)
  currentPolaroid = document.getElementById(`item-${docId}`)
  if (!currentPolaroid) {
    scheduleNextPolaroid()
    return
  }

  hidePreviousPolaroid()
  currentPolaroid.style.transform = 'translate(0, 0) rotate(0deg) scale(1.1)'
  currentPolaroid.style.zIndex = 200
  currentPolaroid.classList.add('active')
  previousPolaroid = currentPolaroid
  scheduleNextPolaroid()
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
    scheduleNextPolaroid()
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
  /* Le polaroid posizionate/ruotate a caso possono uscire dai bordi laterali:
     clip (non hidden) evita la scrollbar orizzontale senza creare un contenitore
     scrollabile e lascia libero l'overflow verticale */
  overflow-x: clip;
  overflow-y: visible;
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
