<script setup>
defineProps({
  progress: {
    type: Number,
    required: true,
  },
})
</script>

<template>
  <div
    class="progress-bar-track"
    role="progressbar"
    :aria-valuenow="Math.round(progress)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="progress-bar-fill"
      :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
    />
  </div>
</template>

<style scoped>
.progress-bar-track {
  width: min(90vw, 20rem);
  height: 1.25rem;
  background-color: #9ca3af;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: #f0bb4f;
  transition: width 0.35s ease;
}
</style>
