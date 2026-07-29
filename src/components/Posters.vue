<script setup>
import { ref, inject, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { loadPosters, posterPublicUrl } from '../posters.js'

const router = useRouter()
const global = inject('global')

const posters = ref([])
const isLoading = ref(true)
const loadError = ref(null)
const current = ref(0)
const gap = 16
const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }

const category = ref(null)
const shuffledItems = ref([])

const categoryLabels = {
  film: 'Poster di film',
  painting: 'Quadri',
}

const categories = computed(() => [
  ...new Set(posters.value.map((p) => p.category).filter(Boolean)),
])

function categoryLabel(cat) {
  return categoryLabels[cat] || cat
}

onMounted(async () => {
  window.addEventListener('resize', onResize)
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

onUnmounted(() => window.removeEventListener('resize', onResize))

function setCategory(cat) {
  category.value = cat
  current.value = 0
  shuffledItems.value = [...posters.value]
    .filter((p) => p.category === cat)
    .sort(() => Math.random() - 0.5)
}

const visible = computed(() => {
  if (windowWidth.value < 640) return 1
  if (windowWidth.value < 1024) return 3
  return 5
})

const totalGroups = computed(() =>
  Math.ceil(shuffledItems.value.length / visible.value) || 1,
)

const cardWidth = computed(() =>
  `calc(${100 / visible.value}% - ${(gap * (visible.value - 1)) / visible.value}px)`,
)

function next() {
  if (current.value < totalGroups.value - 1) current.value++
}

function prev() {
  if (current.value > 0) current.value--
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
          class="px-5 py-2 text-sm font-semibold transition-colors"
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
      <div class="relative mx-auto max-w-[1693px] px-4 sm:px-8 md:px-12">
        <button
          type="button"
          class="carousel-nav carousel-nav-prev"
          aria-label="Poster precedenti"
          :disabled="current === 0"
          @click="prev"
        >
          ‹
        </button>

        <div class="overflow-hidden px-10 sm:px-12 md:px-14">
          <div
            class="flex transition-transform duration-500 ease-in-out"
            :style="{
              transform: `translateX(calc(-${current * 100}% - ${current * gap}px))`,
              gap: `${gap}px`,
            }"
          >
            <div
              v-for="group in totalGroups"
              :key="group"
              class="flex w-full shrink-0"
              :style="{ gap: `${gap}px` }"
            >
              <button
                v-for="item in shuffledItems.slice((group - 1) * visible, group * visible)"
                :key="item.file_path"
                type="button"
                class="poster-card flex shrink-0 cursor-pointer flex-col rounded-xl bg-[#242424] p-3 text-left transition-colors duration-300 hover:bg-[var(--btn-primary-color)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--btn-primary-color)]"
                :style="{ width: cardWidth }"
                @click="selectPoster(item)"
              >
                <div class="mb-2 flex min-h-[2.5rem] items-end sm:min-h-[3rem]">
                  <p class="line-clamp-2 w-full text-left text-sm font-bold leading-snug text-white sm:text-base">
                    {{ item.name }}
                  </p>
                </div>
                <div class="aspect-[2/3] w-full overflow-hidden rounded-md">
                  <img
                    :src="posterPublicUrl(item.file_path)"
                    :alt="item.name"
                    class="block h-full w-full object-cover"
                  >
                </div>
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="carousel-nav carousel-nav-next"
          aria-label="Poster successivi"
          :disabled="current >= totalGroups - 1"
          @click="next"
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
}

@media (min-width: 640px) {
  .carousel-nav {
    font-size: 3rem;
  }
}

.carousel-nav:hover:not(:disabled) {
  color: var(--btn-primary-color);
}

.carousel-nav:disabled {
  cursor: default;
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
