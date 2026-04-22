<script setup>
import polaroid from './Polaroid.vue';
import Header from './Header.vue';
import { ref, inject } from 'vue';
const global = inject('global');
</script>

<template>
  <div class="flex flex-col justify-center w-full min-h-screen px-6 md:px-12 lg:px-20">
    <div class="grid grid-cols-2 gap-4 items-center w-full">
      <p class="text-white font-bold text-[8vw] md:text-[6vw] lg:text-[5vw] py-2">
        LABA'S<br>PHOTOBOOTH
      </p>
      <div class="flex justify-center mb-6 md:mb-8">
        <img src="../assets/croniche-disorganiche.png" class="h-auto object-contain max-w-sm w-full">
      </div>
    </div>x
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