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
  <header class="site-header relative z-50 w-full px-[3.5%] pb-4 print:hidden">
    <div class="flex items-start justify-between gap-4">
      <router-link to="/" class="shrink-0 cursor-pointer">
        <img
          src="../assets/logo-laba.svg"
          alt="LABA - Libera Accademia di Belle Arti"
          class="h-10 sm:h-12 md:h-14 lg:h-16 w-auto"
        />
      </router-link>
    </div>
  </header>
</template>
