<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../composables/useAuth';

const route = useRoute();
const { user, isAdmin, authReady } = useAuth();
const error = ref(null);
const showLogin = computed(() => 'login' in route.query);

const loginWithGoogle = async () => {
  try {
    error.value = null;
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    console.error('Errore login:', err);
    error.value = err.message || 'Errore durante il login';
  }
};

const logout = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Errore logout:', err);
  }
};
</script>

<template>
  <div v-if="user || showLogin" class="auth-wrapper flex items-center gap-3">
    <template v-if="!authReady">
      <div class="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
    </template>
    <template v-else-if="user">
      <div class="flex items-center gap-2">
        <img
          referrerpolicy="no-referrer"
          v-if="user.photoURL"
          :src="user.photoURL"
          :alt="user.displayName || 'Avatar'"
          class="w-8 h-8 rounded-full object-cover ring-2 ring-white/30"
        />
        <div
          v-else
          class="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-[var(--text-primary)] text-md font-medium"
        >
          {{ (user.displayName || user.email || '?')[0].toUpperCase() }}
        </div>
        <div class="hidden sm:block text-left">
          <p class="text-[var(--text-primary)] text-md font-medium truncate max-w-[120px]">
            {{ user.displayName || user.email }}
          </p>
        </div>
        <router-link
          v-if="isAdmin"
          to="/admin"
          class="cursor-pointer px-2 py-1 text-md text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] hover:bg-black/5 rounded transition-colors"
        >
          Admin
        </router-link>
        <button
          type="button"
          @click="logout"
          class="btn-btl-secondary cursor-pointer"
        >
          Esci
        </button>
      </div>
    </template>
    <template v-else>
      <button
        type="button"
        @click="loginWithGoogle"
        class="btn-btl-secondary cursor-pointer"
      >
        Accedi con Google
      </button>
      <p v-if="error" class="text-red-400 ">{{ error }}</p>
    </template>
  </div>
</template>

<style scoped>
.auth-wrapper {
  min-height: 32px;
}
</style>
