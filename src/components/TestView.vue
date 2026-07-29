<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import Auth from './Auth.vue';
import TestUpload from './TestUpload.vue';

const user = ref(null);
const authLoading = ref(true);

let unsubscribe;

onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser;
    authLoading.value = false;
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<template>
  <div class="test-view w-full">
    <div v-if="authLoading" class="text-white/70 py-12 text-center">
      Verifica accesso...
    </div>

    <div v-else-if="!user" class="max-w-md mx-auto py-12 text-center text-white">
      <h1 class="text-2xl font-bold mb-4">Area test</h1>
      <p class="text-white/70 mb-6">Accedi per usare la composizione frame.</p>
      <div class="flex justify-center">
        <Auth />
      </div>
    </div>

    <TestUpload v-else />
  </div>
</template>
