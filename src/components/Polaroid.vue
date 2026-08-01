<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import QrcodeVue from 'qrcode.vue'

const props = defineProps({
  url: {
    type: String,
  },
  /** Outer polaroid width in px */
  width: {
    type: Number,
    default: null,
  },
  /** No border, shadow or padding — for images that already include a frame */
  plain: {
    type: Boolean,
    default: false,
  },
})

const polaroidRef = ref(null)
const innerRef = ref(null)
const polaroidWidth = ref(460)

const RATIO = {
  outerW: 460,
  outerH: 607,
  innerW: 420,
  innerH: 527,
}

function readRenderedWidth() {
  return polaroidRef.value?.getBoundingClientRect().width ?? polaroidWidth.value
}

function setManagedWidth(px) {
  const w = Math.max(px, 1)
  polaroidWidth.value = w
  polaroidRef.value?.style.setProperty('--polaroid-width', `${w}px`)
}

function hasExternalWidth() {
  return Boolean(polaroidRef.value?.style.getPropertyValue('--polaroid-width').trim())
}

function syncSize() {
  if (props.width != null) {
    setManagedWidth(props.width)
    return
  }

  if (hasExternalWidth()) {
    polaroidWidth.value = readRenderedWidth()
    return
  }

  const inner = innerRef.value
  if (!inner) return

  let innerW = 0
  for (const child of inner.children) {
    if (child.classList?.contains('qrcode')) continue
    const w = child.offsetWidth || child.getBoundingClientRect().width
    if (w > innerW) innerW = w
  }

  if (innerW <= 0) {
    innerW = inner.clientWidth
  }

  if (innerW > 0) {
    setManagedWidth(innerW * (RATIO.outerW / RATIO.innerW))
  } else {
    setManagedWidth(RATIO.outerW)
  }
}

let resizeObserver

onMounted(async () => {
  await nextTick()
  syncSize()

  resizeObserver = new ResizeObserver(() => {
    if (hasExternalWidth() || props.width != null) {
      polaroidWidth.value = readRenderedWidth()
    } else {
      syncSize()
    }
  })

  if (polaroidRef.value) resizeObserver.observe(polaroidRef.value)
  if (innerRef.value) {
    resizeObserver.observe(innerRef.value)
    innerRef.value.querySelectorAll('img, video, canvas').forEach((el) => {
      resizeObserver.observe(el)
      el.addEventListener('load', syncSize)
    })
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  innerRef.value?.querySelectorAll('img').forEach((el) => {
    el.removeEventListener('load', syncSize)
  })
})

watch(
  () => props.width,
  () => syncSize(),
)

const qrcodeSize = computed(() =>
  Math.round(50 * (polaroidWidth.value / RATIO.outerW)),
)
</script>

<template>
  <div ref="polaroidRef" class="polaroid" :class="{ 'polaroid--plain': plain }">
    <div ref="innerRef" class="polaroid-inner">
      <a v-if="url" :href="url" class="qrcode block cursor-pointer">
        <qrcode-vue :value="url" :size="qrcodeSize" level="H" />
      </a>
      <slot />
    </div>
    <div class="polaroid-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.polaroid {
  --polaroid-width: 460px;
  --pad: calc(var(--polaroid-width) * 20 / 460);
  --footer-h: calc(var(--polaroid-width) * 60 / 460);

  position: relative;
  width: var(--polaroid-width);
  height: calc(var(--polaroid-width) * 607 / 460);
  border-radius: calc(var(--polaroid-width) * 12 / 460);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  background: #f4f4f4;
  box-sizing: border-box;
}

.polaroid-inner {
  position: absolute;
  top: var(--pad);
  left: var(--pad);
  width: calc(var(--polaroid-width) * 420 / 460);
  height: calc(var(--polaroid-width) * 527 / 460);
  overflow: hidden;
}

.polaroid-footer {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: var(--footer-h);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.polaroid .qrcode {
  position: absolute;
  transition: opacity 0.3s ease;
  z-index: 1000;
  border: calc(var(--polaroid-width) * 5 / 460) solid white;
}

.polaroid .qrcode:hover {
  opacity: 0.8;
}

.polaroid--plain {
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  height: auto;
  --pad: 0;
  --footer-h: 0;
}

.polaroid--plain .polaroid-inner {
  position: relative;
  top: 0;
  left: 0;
  width: 100%;
  height: auto;
  overflow: visible;
}

.polaroid--plain .polaroid-inner :deep(img) {
  width: 100%;
  height: auto;
  display: block;
}

.polaroid--plain .polaroid-footer {
  display: none;
}
</style>
