<script setup>
import { ref, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loadPosters, posterPublicUrl } from '../posters.js'

const router = useRouter()
const global = inject('global')

const posters = ref([])
const isLoading = ref(true)
const current = ref(0)
const visible = 5
const gap = 16

onMounted(async () => {
  posters.value = await loadPosters()
  posters.value.sort(() => Math.random() - 0.5)
  isLoading.value = false
})

function next() {
  if (current.value < 15 - visible) current.value++
}
function prev() {
  if (current.value > 0) current.value--
}
</script>

<template>
  <div class="posters-container container mx-auto max-w-7xl">
    <div class="h-35 flex items-center justify-center">
      <h1 class="text-white font-bold text-[6vw] sm:text-[2vw] py-2">Seleziona il tuo poster preferito:</h1>
    </div>

    <div v-if="isLoading" class="text-white/70 text-center py-12">Caricamento poster...</div>

    <template v-else>
      <div class="relative flex items-center">
        <button @click="prev" class="absolute left-0 z-10 text-white text-5xl px-4 hover:text-orange-400 transition-colors">
          ‹
        </button>

        <div class="overflow-hidden w-full px-10">
          <div
            class="flex transition-transform duration-500 ease-in-out"
            :style="{ transform: `translateX(calc(-${current * (100 / visible)}% - ${current * gap / visible}px))`, gap: `${gap}px` }"
          >
            <a
              v-for="poster in posters.slice(0, 10)"
              :key="poster.file_path"
              class="poster cursor-pointer border bg-[#4f485f] rounded-lg p-3 flex flex-col hover:bg-[#7069a2] transition-all duration-300 flex-shrink-0"
              style="width: 160px; height: 260px;"
              @click="() => { global.poster = poster; router.push('/cam'); }"
            >
              <div class="w-full flex-1 overflow-hidden rounded bg-black">
                <img :src="posterPublicUrl(poster.file_path)" :alt="poster.name" class="w-full h-full object-contain" />
              </div>
              <div class="text-xs font-bold text-left w-full text-white leading-tight mt-2">{{ poster.name }}</div>
            </a>
          </div>
        </div>

        <button @click="next" class="absolute right-0 z-10 text-white text-5xl px-4 hover:text-orange-400 transition-colors">
          ›
        </button>
      </div>

      <div class="flex justify-center gap-2 mt-6">
        <button
          v-for="(_, index) in posters.slice(0, 10)"
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
</style>
