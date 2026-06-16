<script setup>
import Polaroid from './Polaroid.vue'
import Header from './Header.vue'
import { ref, inject, onMounted } from 'vue'

const global = inject('global')
const getStorageUrl = inject('getStorageUrl')

const strip = ref([])

onMounted(async () => {
  const response = await fetch('/.netlify/functions/list')
  const data = await response.json()
  if (!data?.length) return
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]]
  }
  strip.value = await Promise.all(
    data.slice(0, 3).map(async (item, i) => ({
      ...item,
      image_processed: await getStorageUrl(item.image_processed)
    }))
  )
})

const rotations = [-6, 1, 7]
const offsets = ['-8px', '0px', '-12px']
</script>

<template>
<div class="flex flex-col w-full h-full min-h-[calc(100svh-8rem)]">
  <div class="flex-1 flex flex-col justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center w-full">
      <p class="text-white font-bold text-[6vw] md:text-[6vw] lg:text-[5vw] py-2">
        LABA'S<br>PHOTOBOOTH
      </p>
      <div class="hidden md:flex relative items-end justify-center h-72">
        <div
          v-for="(item, i) in strip"
          :key="item.docId"
          class="absolute"
          :style="{
            transform: `rotate(${rotations[i]}deg)`,
            zIndex: i + 1,
            bottom: offsets[i],
            left: `calc(50% + ${(i - 1) * 110}px)`,
          }"
        >
          <div class="bg-[#f4f4f4] rounded-[6px] p-[6px] pb-[28px] w-[120px]"
               style="box-shadow: 0 4px 20px rgba(0,0,0,0.4)">
            <img :src="item.image_processed" class="w-full aspect-square object-cover block rounded-[3px]" />
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="flex relative z-20 items-center justify-start pb-40 pt-4">
    <router-link v-if="global.features.camera" to="/posters" class="btn-primary mr-4">
      Scopri l'esperienza
    </router-link>
    <router-link v-if="global.features.camera" to="/list" class="btn-secondary">
      Vai alla raccolta
    </router-link>
  </div>
</div>
</template>