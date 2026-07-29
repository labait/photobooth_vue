<script setup>
import { ref, inject, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules'
import { loadPosters, posterPublicUrl } from '../posters.js'

import 'swiper/css'
import 'swiper/css/navigation'

const router = useRouter()
const global = inject('global')

const modules = [Navigation]

const posters = ref([])
const isLoading = ref(true)
const loadError = ref(null)

const category = ref(null)
const shuffledItems = ref([])

const categoryLabels = {
  film: 'Poster di film',
  painting: 'Quadri',
}

const categories = computed(() => [
  ...new Set(posters.value.map((p) => p.category).filter(Boolean)),
])

const swiperKey = computed(() => `${category.value ?? 'all'}-${shuffledItems.value.length}`)

/** slidesPerView per breakpoint — modifica qui */
const swiperBreakpoints = {
  0: { slidesPerView: 1, spaceBetween: 16 },
  640: { slidesPerView: 3, spaceBetween: 16 },
  1024: { slidesPerView: 4, spaceBetween: 16 },
}

function categoryLabel(cat) {
  return categoryLabels[cat] || cat
}

onMounted(async () => {
  try {
    posters.value = await loadPosters()
    const cats = categories.value
    if (cats.length > 0) {
      setCategory(cats[0])
    } else {
      shuffledItems.value = [...posters.value].sort(() => Math.random() - 0.5)
    }
  } catch (err) {
    loadError.value = err.message
  } finally {
    isLoading.value = false
  }
})

function setCategory(cat) {
  category.value = cat
  shuffledItems.value = [...posters.value]
    .filter((p) => p.category === cat)
    .sort(() => Math.random() - 0.5)
}

function selectPoster(poster) {
  global.value.poster = poster
  router.push('/cam')
}
</script>

<template>
  <div class="posters-page flex flex-1 flex-col">
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
          class="cursor-pointer px-5 py-2 text-sm font-semibold transition-colors"
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
      class="carousel-band relative left-1/2 w-screen -translate-x-1/2 bg-[#2c2c2c] py-8 md:py-10 lg:py-12"
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
              @click="selectPoster(item)"
            >
              <div class="mb-2 flex min-h-[2.5rem] items-end sm:min-h-[3rem]">
                <p class="line-clamp-2 w-full text-left text-sm font-bold leading-snug text-white sm:text-base">
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

.posters-swiper :deep(.swiper-slide) {
  height: auto;
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
