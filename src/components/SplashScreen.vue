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
  <div class="flex flex-col w-full h-full min-h-[calc(100svh-8rem)]">
    <div class="flex-1 flex flex-col justify-center">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center w-full">

        <!-- colonna sinistra: titolo -->
        <p class="text-white font-bold text-[13vw] md:text-[6vw] lg:text-[5vw] py-2 leading-tight">
          LABA'S<br>PHOTOBOOTH
        </p>

        <!-- colonna destra: polaroid mobile + desktop -->
        <div>
          <!-- mobile -->
          <div class="flex md:hidden relative items-end justify-center h-[280px] mb-8">
            <div
              v-for="(item, i) in strip"
              :key="item.docId"
              class="absolute transition-transform duration-300"
              :style="{
                transform: `rotate(${rotations[i]}deg)`,
                zIndex: i + 1,
                bottom: offsets[i],
                left: positions[i],
              }"
            >
              <div
                class="bg-[#f4f1ec] rounded-[6px] p-[10px] pb-[38px] w-[150px]"
                style="box-shadow: 2px 6px 28px rgba(0,0,0,0.5)"
              >
                <img
                  :src="item.image_processed"
                  class="w-full aspect-square object-cover block rounded-[3px]"
                />
              </div>
            </div>
          </div>

          <!-- desktop -->
          <div class="hidden md:flex relative items-end justify-center h-[440px]">
            <div
              v-for="(item, i) in strip"
              :key="item.docId"
              class="absolute transition-transform duration-300 hover:scale-105 hover:z-10"
              :style="{
                transform: `rotate(${rotations[i]}deg)`,
                zIndex: i + 1,
                bottom: offsets[i],
                left: positions[i],
              }"
            >
              <div
                class="bg-[#f4f1ec] rounded-[6px] p-[12px] pb-[48px] w-[210px]"
                style="box-shadow: 2px 6px 28px rgba(0,0,0,0.5)"
              >
                <img
                  :src="item.image_processed"
                  class="w-full aspect-square object-cover block rounded-[3px]"
                />
              </div>
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