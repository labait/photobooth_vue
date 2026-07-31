<script setup>
import { ref } from 'vue'

defineProps({
  data: {
    type: Object,
    required: true
  }
})

</script>

<template>
  <pre class="debug bg-white absolute  left-0 right-0 z-1000 p-4  overflow-y-scroll">{{ data }}</pre>
</template>

<style scoped>
    .debug {
        --debug-height: 300px;
    }

    .debug {
        bottom: 0;
        height: var(--debug-height);
    }
</style>