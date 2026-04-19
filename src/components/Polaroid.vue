<script setup>
import { ref, inject, defineProps } from 'vue';
import QrcodeVue, { QrcodeCanvas, QrcodeSvg } from 'qrcode.vue'
import { RouterLink } from 'vue-router';

defineProps({
    url: { 
        type: String,
    }
})

</script>

<template>
    <div class="polaroid">
       <div class="polaroid-inner">
            <a v-if="url" :href="url" class="qrcode block">
                <qrcode-vue :value="url" :size="50" level="H" />
            </a>
            <slot /> 
       </div>
       <div class="absolute left-0 w-full flex bottom-0">
            <slot name="footer"></slot>
       </div>
    </div>
</template>

<style scoped>
.polaroid {
    --polaroid-width: 460px;
    --polaroid-height: 607px;
    --polaroid-padding: 20px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.3);
    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    background: #f4f4f4;
}

.polaroid {
    width: var(--polaroid-width);
    height: var(--polaroid-height);
    .polaroid-inner {
        margin: var(--polaroid-padding);
        width: calc(var(--polaroid-width) - var(--polaroid-padding) * 2);
        height: calc(var(--polaroid-height) - var(--polaroid-padding) * 4);
        overflow: hidden;
        position: relative;
    }   
    .qrcode {
        position: absolute;
        transition: opacity 0.3s ease;
        z-index: 1000;
        border: 5px solid white;
        &:hover {
            opacity: 0.8;
        }
    }
}
</style>
