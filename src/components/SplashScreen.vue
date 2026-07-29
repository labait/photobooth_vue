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
const rotations = [-7, 1, 8]
const offsets = ['-10px', '16px', '-14px']
const positions = ['2%', '28%', '54%']
</script>

<template>
  <div class="grid grid-cols-1 gap-4 items-center w-full mb-6">
    <div class="text-white text-center font-bold text-[10vw] md:text-[6vw] lg:text-[5vw] py-2 leading-tight mb-4">
      Photobooth
    </div>
    <div class="flex justify-center md:justify-center">
        <div
          v-for="(item, i) in strip"
          :key="item.docId"
          class="transition-transform duration-300 hover:scale-105 hover:z-10"
          :style="{
            transform: `rotate(${rotations[i]}deg)`,
            zIndex: i + 1,
            bottom: offsets[i],
            left: positions[i],
          }"
        >
          <Polaroid class="">
            <img :src="item.image_processed" class="w-[30vw]" />
          </Polaroid>
        </div>
      </div>
  </div>
  <div class="flex relative z-20 items-center justify-center pt-4">
    <router-link v-if="global.features.camera" to="/posters" class="btn-primary mr-4">
      Scopri l'esperienza
    </router-link>
    <router-link v-if="global.features.camera" to="/list" class="btn-secondary">
      Vai alla raccolta
    </router-link>
  </div>
</template>