<script setup>
import polaroid from './Polaroid.vue';
import Header from './Header.vue';
import { ref, inject } from 'vue';

const global = inject('global');
</script>

<template>
  <div class="flex flex-col justify-start w-full h-full">
    <div class="grid grid-cols-2 gap-4 items-center">
      <p class="text-white font-bold text-[8vw] md:text-[6vw] py-2">
        LABA'S<br>PHOTOBOOTH
      </p>
      <div class="flex justify-center mb-6 md:mb-8">
        <img src="../assets/croniche-disorganiche.png" class="h-auto object-contain max-w-sm">
        <!-- commento  <img src="../assets/txt.svg" class="w-full h-auto object-cover block">
        <img src="../assets/polaroid.svg" class="w-full h-auto object-cover block"> -->
      </div>
    </div>

    <div class="flex relative z-20 items-center justify-start mb-16">
      <router-link
        v-if="global.features.camera"
        to="/posters"
        class="btn-primary mr-4">
        Scopri l'esperienza
      </router-link>

      <router-link
        v-if="global.features.camera"
        to="/list"
        class="btn-secondary">
        Vai alla raccolta
      </router-link>
    </div>
  </div>
</template>