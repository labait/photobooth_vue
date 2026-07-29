<script setup>
import Polaroid from './Polaroid.vue'
import { ref, inject, onMounted } from 'vue'

const global = inject('global')
const getStorageUrl = inject('getStorageUrl')
const strip = ref([])

onMounted(async () => {
  const response = await fetch('/.netlify/functions/list')
  const data = await response.json()
  if (!data?.length) return
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[data[i], data[j]] = [data[j], data[i]]
  }
  strip.value = await Promise.all(
    data.slice(0, 3).map(async (item) => ({
      ...item,
      image_processed: await getStorageUrl(item.image_processed),
    })),
  )
})

const rotations = [-17, 6, 12]
</script>

<template>
  <section class="splash flex flex-1 flex-col justify-center w-full">
    <div
      class="splash-content mx-auto flex w-full max-w-[1400px] flex-col items-center gap-10 px-4 py-8 md:px-10 lg:flex-row lg:items-center lg:justify-center lg:gap-16 xl:gap-24"
    >
      <div
        class="polaroids-stack relative mx-auto h-[min(55vw,420px)] w-full max-w-[min(90vw,520px)] shrink-0 lg:mx-0 lg:h-[420px] lg:w-[520px]"
      >
        <div
          v-for="(item, i) in strip"
          :key="item.docId"
          class="polaroid-item absolute transition-transform duration-300 hover:scale-105 hover:z-20"
          :style="{
            transform: `rotate(${rotations[i]}deg)`,
            zIndex: i + 1,
            left: `${12 + i * 22}%`,
            top: `${8 + (i % 2) * 6}%`,
          }"
        >
          <Polaroid :style="{ '--polaroid-width': 'clamp(180px, 26vw, 260px)' }">
            <img
              :src="item.image_processed"
              class="absolute inset-0 block h-full w-full object-cover"
              alt=""
            />
          </Polaroid>
        </div>
      </div>

      <div class="splash-side flex w-full max-w-md flex-col items-center gap-8 lg:max-w-lg lg:items-start">
        <img
          src="../assets/btl/logo-iniziativa.png"
          alt="La tua energia creativa dai forma al futuro"
          class="w-full max-w-[min(85vw,398px)] h-auto"
        />
        <div class="flex flex-wrap items-center justify-center gap-5 lg:justify-start">
          <router-link
            v-if="global.features.camera"
            to="/posters"
            class="btn-btl-primary"
          >
            Scopri l'esperienza
          </router-link>
          <router-link
            v-if="global.features.list"
            to="/list"
            class="btn-btl-secondary"
          >
            Vai alla raccolta
          </router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.polaroid-item {
  transform-origin: center center;
}
</style>
