<script setup>
import { computed, inject } from 'vue'

const global = inject('global')

const loadingMessage = computed(() => {
  const value = global.value.isLoading
  return typeof value === 'string' ? value : ''
})
</script>

<template>
  <div
    class="loading-overlay flex flex-col items-center justify-center overflow-hidden"
    role="status"
    aria-live="polite"
    :aria-label="loadingMessage || 'Caricamento in corso'"
  >
    <div class="loading-spinner" aria-hidden="true" />

    <p
      v-if="loadingMessage"
      class="loading-message mt-8 max-w-lg px-6 text-center text-base font-semibold leading-relaxed text-white sm:text-lg"
    >
      {{ loadingMessage }}
    </p>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(0 0 0 / 0.94);
}

.loading-spinner {
  width: 5rem;
  height: 5rem;
  border-radius: 9999px;
  border: 6px solid rgb(255 255 255 / 0.18);
  border-top-color: #fff;
  border-right-color: #fff;
  border-bottom-color: #fff;
  animation: loading-spin 0.85s linear infinite;
}

@media (min-width: 640px) {
  .loading-spinner {
    width: 5.5rem;
    height: 5.5rem;
    border-width: 7px;
  }
}

@keyframes loading-spin {
  to { transform: rotate(360deg); }
}

.loading-message {
  text-wrap: balance;
}
</style>
