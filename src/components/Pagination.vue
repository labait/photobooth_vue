<script setup>
defineProps({
  currentPage: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
})

defineEmits(['goToPage'])
</script>

<template>
  <nav class="flex items-center justify-center gap-3" aria-label="Paginazione">
    <button
      type="button"
      :disabled="currentPage <= 1"
      class="btn-btl-secondary min-w-[2.5rem] px-3 py-1.5  disabled:opacity-40"
      @click="$emit('goToPage', currentPage - 1)"
    >
      ‹
    </button>
    <span class=" font-medium text-[var(--text-primary)] tabular-nums">
      {{ currentPage }} / {{ totalPages }}
    </span>
    <button
      type="button"
      :disabled="currentPage >= totalPages"
      class="btn-btl-secondary min-w-[2.5rem] px-3 py-1.5  disabled:opacity-40"
      @click="$emit('goToPage', currentPage + 1)"
    >
      ›
    </button>
  </nav>
</template>
