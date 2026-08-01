<script setup>
import { inject } from 'vue'

const global = inject('global')

function onConfirm() {
  if (global.value.dialog.onConfirm != null) {
    global.value.dialog.onConfirm()
  }
  global.value.dialog = {}
}

function onCancel() {
  if (global.value.dialog.onCancel != null) {
    global.value.dialog.onCancel()
  }
  global.value.dialog = {}
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="global.dialog.title ? 'dialog-title' : undefined"
      aria-describedby="dialog-desc"
    >
      <div class="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        class="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-black/5"
        @click.stop
      >
        <h2
          v-if="global.dialog.title"
          id="dialog-title"
          class="mb-3 text-lg font-bold text-neutral-900"
        >
          {{ global.dialog.title }}
        </h2>
        <p
          v-if="global.dialog.text"
          id="dialog-desc"
          class="text-neutral-700 whitespace-pre-wrap"
        >
          {{ global.dialog.text }}
        </p>
        <pre
          v-if="global.dialog.errorDetail"
          class="mt-4 max-h-40 overflow-auto rounded-lg bg-neutral-100 p-3 text-left text-xs text-neutral-800 whitespace-pre-wrap break-words"
        >{{ global.dialog.errorDetail }}</pre>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            v-if="global.dialog.onCancel != null"
            type="button"
            class="btn btn-secondary !inline-flex max-w-none w-auto px-5 py-2.5 "
            @click="onCancel"
          >
            {{ global.dialog.cancelText ?? 'Annulla' }}
          </button>
          <button
            type="button"
            class="btn btn-primary !inline-flex max-w-none w-auto px-5 py-2.5 "
            @click="onConfirm"
          >
            {{ global.dialog.confirmText ?? 'OK' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
