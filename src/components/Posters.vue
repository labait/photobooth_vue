<script setup>
import { ref, inject, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules'
import { loadPosters, posterPublicUrl } from '../images.js'

import 'swiper/css'
import 'swiper/css/navigation'

const router = useRouter()
const route = useRoute()
const global = inject('global')

const modules = [Navigation]

const posters = ref([])
const isLoading = ref(true)
const loadError = ref(null)

const category = ref(null)
const shuffledItems = ref([])
const shuffleSeed = ref(0)

function shuffleArray(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function refreshShuffledItems() {
  if (!posters.value.length) {
    shuffledItems.value = []
    return
  }

  const pool = category.value
    ? posters.value.filter((p) => p.category === category.value)
    : posters.value

  shuffledItems.value = shuffleArray(pool)
  shuffleSeed.value += 1
}

const categoryLabels = {
  film: 'Poster di film',
  painting: 'Quadri',
}

const categories = computed(() => [
  ...new Set(posters.value.map((p) => p.category).filter(Boolean)),
])

const swiperKey = computed(() => `${category.value ?? 'all'}-${shuffleSeed.value}`)

/** slidesPerView per breakpoint — modifica qui */
const swiperBreakpoints = {
  0: { slidesPerView: 1, spaceBetween: 16 },
  640: { slidesPerView: 2, spaceBetween: 16 },
  1024: { slidesPerView: 3, spaceBetween: 16 },
  1280: { slidesPerView: 4, spaceBetween: 16 },
}

function categoryLabel(cat) {
  return categoryLabels[cat] || cat
}

onMounted(async () => {
  try {
    posters.value = await loadPosters()
    const cats = categories.value
    if (cats.length > 0) {
      category.value = cats[0]
    }
    refreshShuffledItems()
  } catch (err) {
    loadError.value = err.message
  } finally {
    isLoading.value = false
  }
})

watch(
  () => route.name,
  (name) => {
    if (name === 'posters' && posters.value.length) {
      refreshShuffledItems()
    }
  },
)

function setCategory(cat) {
  category.value = cat
  refreshShuffledItems()
}

function selectEditionImage(image) {
  global.value.edition_image = image
  router.push('/cam')
}
</script>

<template>
  <div class="posters-page flex flex-1 flex-col overflow-x-clip overscroll-x-none">
    <div class="title-section px-4 pt-10 pb-8 md:pt-14 md:pb-10 lg:pt-16">
      <h1
        class="mx-auto max-w-4xl text-center text-3xl font-bold leading-tight tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl lg:text-[60px] lg:leading-[70px] lg:tracking-[-1.2px]"
      >
        Quale opera sceglierai?
      </h1>

      <div
        v-if="!isLoading && !loadError && categories.length > 1"
        class="mt-6 flex flex-wrap items-center justify-center gap-3"
      >
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          class="cursor-pointer px-5 py-2  font-semibold transition-colors"
          :class="
            category === cat
              ? 'bg-[var(--btn-primary-color)] text-white'
              : 'bg-[var(--btn-secondary-bg)] text-[var(--text-primary)] hover:brightness-95'
          "
          @click="setCategory(cat)"
        >
          {{ categoryLabel(cat) }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="px-4 py-16 text-center text-[var(--text-primary)]/60">
      Caricamento poster...
    </div>

    <div v-else-if="loadError" class="px-4 py-16 text-center text-red-600">
      {{ loadError }}
    </div>

    <section
      v-else
      class="carousel-band relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-x-clip overscroll-contain bg-[#2c2c2c] py-8 touch-pan-y md:py-10 lg:py-12"
    >
      <div class="posters-carousel relative mx-auto max-w-[1693px] px-4 sm:px-8 md:px-12">
        <button
          type="button"
          class="posters-carousel-prev carousel-nav carousel-nav-prev"
          aria-label="Poster precedenti"
        >
          ‹
        </button>

        <Swiper
          :key="swiperKey"
          class="posters-swiper px-10 sm:px-12 md:px-14"
          :modules="modules"
          :breakpoints="swiperBreakpoints"
          :touch-angle="35"
          :threshold="8"
          :touch-move-stop-propagation="true"
          :touch-start-prevent-default="false"
          :passive-listeners="false"
          :edge-swipe-detection="true"
          :edge-swipe-threshold="24"
          :resistance-ratio="0.82"
          :navigation="{
            prevEl: '.posters-carousel-prev',
            nextEl: '.posters-carousel-next',
          }"
        >
          <SwiperSlide
            v-for="item in shuffledItems"
            :key="item.file_path"
            class="!h-auto"
          >
            <button
              type="button"
              class="poster-card flex h-full w-full cursor-pointer flex-col rounded-xl bg-[#242424] p-3 text-left transition-colors duration-300 hover:bg-[var(--btn-primary-color)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--btn-primary-color)]"
              @click="selectEditionImage(item)"
            >
              <div class="mb-2 flex min-h-[2.5rem] items-end sm:min-h-[3rem]">
                <p class="line-clamp-2 w-full text-left  font-bold leading-snug text-white sm:text-base">
                  {{ item.name }}
                </p>
              </div>
              <div class="poster-image w-full overflow-hidden rounded-md">
                <img
                  :src="posterPublicUrl(item.file_path)"
                  :alt="item.name"
                  class="block h-full w-full object-cover"
                >
              </div>
            </button>
          </SwiperSlide>
        </Swiper>

        <button
          type="button"
          class="posters-carousel-next carousel-nav carousel-nav-next"
          aria-label="Poster successivi"
        >
          ›
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.posters-page {
  width: 100%;
  max-width: 100%;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.poster-image {
  aspect-ratio: 2 / 3;
  min-height: 16rem;
}

@media (min-width: 640px) {
  .poster-image {
    min-height: 22rem;
  }
}

@media (min-width: 1024px) {
  .poster-image {
    min-height: 27rem;
  }
}

.posters-swiper :deep(.swiper),
.posters-swiper :deep(.swiper-wrapper) {
  touch-action: pan-y pinch-zoom;
  overscroll-behavior: contain;
}

.posters-swiper :deep(.swiper-slide) {
  height: auto;
  touch-action: pan-y pinch-zoom;
}

.poster-card {
  touch-action: manipulation;
}

.carousel-nav {
  position: absolute;
  top: 50%;
  z-index: 10;
  transform: translateY(-50%);
  padding: 0 0.25rem;
  font-size: 2.5rem;
  line-height: 1;
  color: white;
  cursor: pointer;
  transition: color 0.2s ease, opacity 0.2s ease;
  border: none;
  background: transparent;
}

@media (min-width: 640px) {
  .carousel-nav {
    font-size: 3rem;
  }
}

.carousel-nav:hover:not(.swiper-button-disabled) {
  color: var(--btn-primary-color);
}

.carousel-nav.swiper-button-disabled {
  cursor: not-allowed;
  opacity: 0.25;
}

.carousel-nav-prev {
  left: 0.25rem;
}

.carousel-nav-next {
  right: 0.25rem;
}

@media (min-width: 640px) {
  .carousel-nav-prev {
    left: 0.5rem;
  }

  .carousel-nav-next {
    right: 0.5rem;
  }
}
</style>
