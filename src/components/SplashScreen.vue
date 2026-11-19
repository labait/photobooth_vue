<script setup>
import Polaroid from './Polaroid.vue'
import { ref, onMounted } from 'vue'
import { useFeatureVisibility } from '../composables/useFeatureAccess'

const strip = ref([])
const { showCreateButton, showListButton } = useFeatureVisibility()

const removeFromStrip = (docId) => {
  strip.value = strip.value.filter((item) => item.docId !== docId)
}

onMounted(async () => {
  try {
    const response = await fetch('/.netlify/functions/list')
    const data = await response.json()
    if (!response.ok || data?.error || !Array.isArray(data) || !data.length) return
    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[data[i], data[j]] = [data[j], data[i]]
    }
    strip.value = data
      .filter((item) => item.image_processed)
      .slice(0, 3)
  } catch (e) {
    console.warn('Errore caricamento anteprima home:', e)
  }
})

const rotations = [-17, 6, 12]
</script>

<template>
  <section class="splash flex flex-1 flex-col justify-center w-full">
    <div
      class="splash-content mx-auto flex w-full max-w-[1400px] flex-col items-center gap-10 px-4 py-8 md:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 xl:gap-20"
    >
      <div class="splash-side flex w-full max-w-md flex-col items-center gap-8 lg:max-w-[440px] lg:shrink-0 lg:items-start">
        <img
          src="../assets/logo-laba.svg"
          alt="LABA - Libera Accademia di Belle Arti"
          class="w-[clamp(240px,26vw,360px)] h-auto"
        />
        <img
          src="../assets/btl/logo-joborienta.png"
          alt="JOB&amp;Orienta - Salone Orientamento Scuola Formazione Lavoro"
          class="w-[clamp(150px,16vw,230px)] h-auto"
        />
        <div
          class="flex flex-col items-center gap-1.5 text-center text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:items-start lg:text-left lg:text-5xl"
        >
          <span class="inline-block rounded-lg bg-[#201c28] px-3 py-1 text-white">
            La tua <span class="text-[#FF7230]">passione</span>.
          </span>
          <span class="inline-block rounded-lg bg-[#201c28] px-3 py-1 text-white">
            Un <span class="text-[#FF7230]">capolavoro</span>.
          </span>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-5 lg:justify-start">
          <router-link
            v-if="showCreateButton"
            to="/posters"
            class="btn-btl-primary cursor-pointer"
          >
            Scopri l'esperienza
          </router-link>
          <router-link
            v-if="showListButton"
            to="/list"
            class="btn-btl-secondary cursor-pointer"
          >
            Vai alla raccolta
          </router-link>
        </div>
      </div>

      <div
        class="polaroids-stack relative mx-auto h-[min(55vw,420px)] w-full max-w-[min(90vw,520px)] shrink-0 lg:mx-0 lg:ml-auto lg:h-[420px] lg:w-[520px]"
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
              v-if="item.image_processed"
              :src="item.image_processed"
              class="absolute inset-0 block h-full w-full object-cover"
              alt=""
              @error="removeFromStrip(item.docId)"
            />
          </Polaroid>
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
