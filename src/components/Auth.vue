<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

const user = ref(null);
const isLoading = ref(true);
const error = ref(null);
const isAdmin = ref(false);

const ensureAccountExists = async (uid) => {
  const accountRef = doc(db, 'accounts', uid);
  const accountSnap = await getDoc(accountRef);
  if (!accountSnap.exists()) {
    await setDoc(accountRef, {
      uid,
      roles: [],
    });
    isAdmin.value = false;
  } else {
    const data = accountSnap.data();
    isAdmin.value = Array.isArray(data?.roles) && data.roles.includes('admin');
  }
};

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

let unsubscribe;
onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    user.value = firebaseUser;
    isLoading.value = false;
    if (firebaseUser) {
      await ensureAccountExists(firebaseUser.uid);
    }
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<template>
  <div class="auth-wrapper flex items-center gap-3">
    <template v-if="isLoading">
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
          class="btn-secondary"
        >
          Esci
        </button>
      </div>
    </template>
    <template v-else>
      <button
        type="button"
        @click="loginWithGoogle"
        class="btn-secondary"
      >
        Accedi con Google
      </button>
      <p v-if="error" class="text-red-400 text-xs">{{ error }}</p>
    </template>
  </div>
</template>

<style scoped>
.auth-wrapper {
  min-height: 32px;
}
</style>
