<script setup>
import { computed } from 'vue'
import { getOpeningConfig } from '../composables/useOpening'
import logoLaba from '../assets/logo-laba.svg'
import logoJobOrienta from '../assets/btl/logo-joborienta.png'

const opening = computed(() => getOpeningConfig())
</script>

<template>
  <div
    class="opening fixed inset-0 z-[200] flex items-center justify-center bg-[#ff7230] px-6"
    role="alert"
    aria-live="polite"
  >
    <div class="text-center text-white">
      <div class="mx-auto mb-10 flex flex-col items-center gap-8">
        <img
          :src="logoLaba"
          alt="LABA - Libera Accademia di Belle Arti"
          class="h-auto w-[min(70vw,380px)] brightness-0 invert"
        />
        <img
          :src="logoJobOrienta"
          alt="JOB&amp;Orienta - Salone Orientamento Scuola Formazione Lavoro"
          class="h-auto w-[min(50vw,260px)]"
        />
      </div>
      <div
        v-if="opening.customText"
        class="whitespace-pre-line text-[5vw] sm:text-[4vw] md:text-[3vw] lg:text-[3vw] max-w-[60vw] mx-auto font-normal"
        v-html="opening.customText"
      >
      </div>
      <template v-else>
        <div class="text-[6vw] font-extrabold">
          Orari di apertura
        </div>
        <div
          v-if="opening.dayLabels.length"
          class="mt-4 text-[5vw] font-semibold leading-relaxed"
        >
          {{ opening.dayLabels.join(', ') }}
        </div>
        <ul
          v-if="opening.hourLabels.length"
          class="mt-4 list-none space-y-2 text-[5vw] font-normal leading-relaxed text-white/80"
        >
          <li v-for="(interval, index) in opening.hourLabels" :key="index">
            {{ interval }}
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>
