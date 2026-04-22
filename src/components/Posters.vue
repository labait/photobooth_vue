<script setup>
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
import posters from '../../src/posters.json'
posters.sort(() => Math.random() - 0.5)
const global = inject('global')
const current = ref(0)
const visible = 5
const gap = 16

function next() {
  if (current.value < 3) current.value++
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
  <div class="posters-container container mx-auto max-w-7xl h-full">
    <div class="h-20 flex items-center justify-center">
      <h1 class="text-white font-bold text-[6vw] sm:text-[2vw] py-2">Seleziona il tuo poster preferito:</h1>
    </div>
    <div class="relative flex items-center py-4">
      <button @click="prev" class="absolute left-0 z-10 text-white text-5xl px-4 hover:text-orange-400 transition-colors">
        ‹
      </button>
      <div class="overflow-hidden w-full px-10">
        <div
          class="flex transition-transform duration-500 ease-in-out"
          :style="{ transform: `translateX(calc(-${current * 100}% - ${current * gap}px))`, gap: `${gap}px` }"
        >
          <div
            v-for="group in 4"
            :key="group"
            class="flex flex-shrink-0 w-full"
            :style="{ gap: `${gap}px` }"
          >
            
              <a v-for="poster in posters.slice((group - 1) * visible, group * visible)"
              :key="poster.name"
              class="poster cursor-pointer bg-[#2b2b2b] rounded-lg p-4 flex flex-col items-center hover:bg-[#FF7230] border-1 border-white transition-transform duration-300 flex-shrink-0"
              style="width: calc(20% - 13px)"
                @click="selectPoster(poster)"
          >
              <div class="title text-lg font-bold mb-2 text-left w-full h-16 text-white">{{ poster.name }}</div>
              <div class="w-full h-64 overflow-hidden rounded">
                <img :src="`/posters/${poster.file_path}`" :alt="poster.name" class="w-full h-full object-cover" />
              </div>
            </a>
          </div>
        </div>
      </div>
      <button @click="next" class="absolute right-0 z-10 text-white text-5xl px-4 hover:text-orange-400 transition-colors">
        ›
      </button>
    </div>
    <div class="flex justify-center gap-3 mt-6">
      <button
        v-for="(_, index) in 4"
        :key="index"
        @click="current = index"
        class="w-2 h-2 rounded-full transition-colors duration-300"
        :class="current === index ? 'bg-orange-400' : 'bg-gray-500'"
      ></button>
    </div>
  </div>
</template>

<style scoped>
</style>