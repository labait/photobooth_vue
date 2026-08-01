<script setup>
defineProps({
  title: {
    type: String,
    required: false,
    default: '',
  },
})
</script>

<template>
  <header class="site-header relative z-50 w-full px-[3.5%] pb-4 print:py-0">
    <div class="flex items-start justify-between gap-4">
      <router-link to="/" class="shrink-0 cursor-pointer">
        <img
          src="../assets/logo-laba.svg"
          alt="LABA Firenze"
          class="h-10 sm:h-12 md:h-14 lg:h-16 w-auto"
        />
      </router-link>
      <router-link to="/" class="shrink-0 cursor-pointer">
        <img
          src="../assets/btl/logo-btl.png"
          alt="BTL Banca del Territorio Lombardo"
          class="h-10 sm:h-12 md:h-14 w-auto"
        />
      </router-link>
    </div>
  </header>
</template>
