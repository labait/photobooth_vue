<script setup>
import logoWhite from '../logo_white.png'
</script>

<template>
  <div
    class="maintenance fixed inset-0 z-[200] flex items-center justify-center bg-[#F0BB4F] px-6"
    role="alert"
    aria-live="polite"
  >
    <div class=" text-center text-[#201c28]">
      <img
        :src="logoWhite"
        alt="LABA"
        class="mx-auto mb-8 max-h-[12vh] w-auto max-w-[min(80vw,420px)]"
      />
      <div class="text-[4vw] font-extrabold ">
        Servizio in manutenzione
      </div>
      <div class="mt-3 text-[3vw] font-normal leading-relaxed text-[#201c28]/80">
       Tornate a visitarci più tardi...
      </div>
    </div>
  </div>
</template>
