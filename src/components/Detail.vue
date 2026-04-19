<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'

import Polaroid from './Polaroid.vue'
import Debug from './Debug.vue'

import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const route = useRoute()
const docId = ref(route.params.docId)

const global = inject('global')
const getResult = inject('getResult')
const detailUrl = inject('detailUrl')
const getStorageUrl = inject('getStorageUrl')
const processImage = inject('processImage')


const loadData = async () => {
  //co  nfig.value.isLoading = true
  const docRef = doc(db, 'items', docId.value)
  global.value.docData = (await getDoc(docRef)).data()
  await getResult(docId.value)

  const original = document.querySelector('.original')
  const processed = document.querySelector('.processed')
  // original.style.display = 'block'
  // processed.style.display = 'none'

  global.value.docData.image_source = await getStorageUrl(global.value.docData.image_source)
  global.value.docData.image_processed = await getStorageUrl(global.value.docData.image_processed)

  global.value.isLoading = false
}


const reProcess = async () => {
  global.value.isLoading = true;
  window.location.reload()
  if(confirm('Sei sicuro di voler rielaborare l\'immagine?')) {
    await processImage(docId.value)
  }
  
}



onMounted(async () => {
  await loadData()
})

const print = () => {
  window.print()
}

</script>

<template>
  <div class="">

    <!-- Contenuto -->
    <div v-if="global.docData" class="polaroids relative z-10 flex flex-col items-center justify-center overflow-visible print:py-16">
      <Polaroid class="original">
        <img :src="global.docData.image_source" class="w-full h-full object-cover block" />
        <template v-slot:footer>
          <a 
            href="#"
            class="w-full h-10 text-center hover:underline text-xl"
            @click="reProcess"
          >re-process</a>
        </template>
      </Polaroid>
      <Polaroid :url="detailUrl(docId)" class="processed mb-16 active">
        <img v-if="global.docData.image_processed" :src="global.docData.image_processed" class="w-full h-full object-cover block" />
        <div v-else class="processing absolute p-3 top-0 left-0 w-full h-full flex flex-col items-center justify-center text-white">
          <p class="text-center font-bold text-xl">Elaborazione in corso</p>
          fai refresh o attendi qualche secondo...
        </div>
      </Polaroid>
    </div>
    

    <div class="btn-wrapper fixed flex justify-center bottom-0 right-0 left-0 m-10 z-10000">
      <div class="p-4">
        <button class="btn-primary" @click="print">Stampa</button>
      </div>
    </div>
  </div>
</template>


<style scoped>

.polaroid {
  .qrcode {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}

.polaroids {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}


@media only print and (min-width: 630px) {
  .polaroid {
    transform: scale(1.3);
  }
}

@media only print and (max-width: 630px) {
  .polaroid {
    transform: scale(1.2);
  }
}


@media only screen and (max-width: 768px) {
  .polaroid {
    transform: scale(.8);
  }
}

@media screen and (min-width: 768px) {
  .polaroids {
    margin-top: 0px;
    flex-direction: row;
    .original {
      transform: translate(-10%, 0%) scale(0.7) rotate(-10deg);
      z-index: 1;
    }

    .processed {
      transform: translateX(-30%) scale(1.2) rotate(5deg);
    }
  } 
}



</style>