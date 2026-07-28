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
    .filter(p => p.category === cat)
    .sort(() => Math.random() - 0.5)
}

const visible = computed(() => {
  if (windowWidth.value < 640) return 1
  if (windowWidth.value < 1024) return 3
  return 5
})

const totalGroups = computed(() => Math.ceil(shuffledItems.value.length / visible.value))
const cardWidth = computed(() =>
  `calc(${100 / visible.value}% - ${(gap * (visible.value - 1)) / visible.value}px)`
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
  <div class="posters-container w-full h-full flex flex-col justify-center px-2 sm:px-0">

    <div class="flex items-center justify-center pt-4 pb-2">
      <h1 class="text-white font-bold text-2xl sm:text-3xl md:text-[2vw] text-center leading-tight">
        Seleziona dove vuoi essere catapultato!
      </h1>
    </div>

    <div v-if="isLoading" class="text-white/70 text-center py-12">
      Caricamento poster...
    </div>

    <div v-else-if="loadError" class="text-red-400 text-center py-12">
      {{ loadError }}
    </div>

    <template v-else>
      <div v-if="categories.length" class="flex justify-center items-center gap-3 my-3">
        <button
          v-for="cat in categories"
          :key="cat"
          @click="setCategory(cat)"
          :class="[
            'px-5 py-2 rounded-full font-semibold text-sm transition-colors duration-300',
            category === cat
              ? 'bg-orange-400 text-white'
              : 'bg-[#2b2b2b] text-gray-300 hover:bg-[#3a3a3a]'
          ]"
        >
          {{ categoryLabel(cat) }}
        </button>
      </div>

      <div class="relative flex items-center py-2">
        <button
          @click="prev"
          class="absolute left-0 z-10 text-white text-4xl sm:text-5xl px-2 sm:px-4 hover:text-orange-400 transition-colors"
        >‹</button>

        <div class="overflow-hidden w-full px-8 sm:px-10">
          <div
            class="flex transition-transform duration-500 ease-in-out"
            :style="{ transform: `translateX(calc(-${current * 100}% - ${current * gap}px))`, gap: `${gap}px` }"
          >
            <div
              v-for="group in totalGroups"
              :key="group"
              class="flex flex-shrink-0 w-full"
              :style="{ gap: `${gap}px` }"
            >
              <a
                v-for="item in shuffledItems.slice((group - 1) * visible, group * visible)"
                :key="item.file_path"
                class="poster cursor-pointer bg-[#2b2b2b] rounded-lg p-3 flex flex-col items-center hover:bg-[#FF7230] border border-white/20 transition-colors duration-300 flex-shrink-0"
                :style="{ width: cardWidth }"
                @click="selectPoster(item)"
              >
                <div class="text-sm sm:text-md font-bold mb-2 text-left w-full text-white line-clamp-2">
                  {{ item.name }}
                </div>
                <div class="w-full aspect-[2/3] overflow-hidden rounded">
                  <img
                    :src="posterPublicUrl(item.file_path)"
                    :alt="item.name"
                    class="w-full h-full object-cover"
                  >
                </div>
              </a>
            </div>
          </div>
        </div>

        <button
          @click="next"
          class="absolute right-0 z-10 text-white text-4xl sm:text-5xl px-2 sm:px-4 hover:text-orange-400 transition-colors"
        >›</button>
      </div>

      <div class="flex justify-center gap-3 mt-4 pb-4">
        <button
          v-for="(_, index) in totalGroups"
          :key="index"
          @click="current = index"
          class="w-2 h-2 rounded-full transition-colors duration-300"
          :class="current === index ? 'bg-orange-400' : 'bg-gray-500'"
        ></button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
