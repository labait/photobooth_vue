<script setup>
import { computed } from 'vue'
import { getOpeningConfig } from '../composables/useOpening'
import logo from '../assets/opening.png'

const opening = computed(() => getOpeningConfig())
</script>

<template>
  <div
    class="opening fixed inset-0 z-[200] flex items-center justify-center bg-[#ff7230] px-6"
    role="alert"
    aria-live="polite"
  >
    <div class="text-center text-white">
      <img
        :src="logo"
        alt="LABA"
        class="mx-auto mb-8 w-auto max-w-[min(80vw,420px)]"
      />
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
