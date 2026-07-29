<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import Pagination from './Pagination.vue';

const route = useRoute();
const router = useRouter();
const global = inject('global');
const getStorageUrl = inject('getStorageUrl');

const items = ref([]);
const currentPage = ref(1);
const itemsPerPage = 10;

const totalPages = computed(() =>
  Math.ceil(items.value.length / itemsPerPage) || 1
);

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return items.value.slice(start, start + itemsPerPage);
});

const goToPage = (page) => {
  const pageNum = Math.max(1, Math.min(page, totalPages.value));
  currentPage.value = pageNum;
  router.push({ path: '/admin', query: { page: pageNum } });
};

const formatTimestamp = (ts) => {
  if (!ts) return '-';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString('it-IT');
};

const getImageUrl = async (urlOrPath) => {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith('http')) return urlOrPath;
  try {
    return getStorageUrl ? await getStorageUrl(urlOrPath) : urlOrPath;
  } catch {
    return null;
  }
};

const loadItems = async () => {
  global.value.isLoading = true;
  const snapshot = await getDocs(collection(db, 'items'));
  const rawItems = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  items.value = await Promise.all(
    rawItems.map(async (item) => ({
      ...item,
      image_source_url: await getImageUrl(item.image_source) ?? item.image_source,
      image_processed_url: await getImageUrl(item.image_processed) ?? item.image_processed,
    }))
  );

  items.value.sort((a, b) => {
    const ta = a.timestamp?.toMillis?.() ?? 0;
    const tb = b.timestamp?.toMillis?.() ?? 0;
    return tb - ta;
  });

  global.value.isLoading = false;

  const pageFromUrl = parseInt(route.query.page, 10);
  if (!isNaN(pageFromUrl) && pageFromUrl >= 1 && pageFromUrl <= totalPages.value) {
    currentPage.value = pageFromUrl;
  } else if (route.query.page !== undefined) {
    currentPage.value = 1;
    router.replace({ path: '/admin', query: totalPages.value > 1 ? { page: 1 } : {} });
  } else if (totalPages.value > 1) {
    router.replace({ path: '/admin', query: { page: 1 } });
  }
};

watch(
  () => route.query.page,
  (pageParam) => {
    if (!pageParam || items.value.length === 0) return;
    const pageNum = parseInt(pageParam, 10);
    if (pageNum >= 1 && pageNum <= totalPages.value && pageNum !== currentPage.value) {
      currentPage.value = pageNum;
    }
  }
);

const deleteItem = async (item) => {
  if (!confirm('Sei sicuro di voler eliminare questo elemento?')) return;

  try {
    await deleteDoc(doc(db, 'items', item.id));

    if (item.image_source && item.image_source.includes('/o/')) {
      try {
        const path = item.image_source
          .split('/o/')[1]
          ?.split('?')[0]
          ?.replace(/%2F/g, '/');
        if (path) {
          const ref = storageRef(storage, path);
          await deleteObject(ref);
        }
      } catch (e) {
        console.warn('Errore cancellazione storage image_source:', e);
      }
    }
    if (item.image_processed && item.image_processed.includes('/o/')) {
      try {
        const path = item.image_processed
          .split('/o/')[1]
          ?.split('?')[0]
          ?.replace(/%2F/g, '/');
        if (path) {
          const ref = storageRef(storage, path);
          await deleteObject(ref);
        }
      } catch (e) {
        console.warn('Errore cancellazione storage image_processed:', e);
      }
    }

    items.value = items.value.filter((i) => i.id !== item.id);
  } catch (err) {
    console.error('Errore eliminazione:', err);
    alert('Errore durante l\'eliminazione');
  }
};

onMounted(loadItems);
</script>

<template>
  <div class="admin w-full py-6">
    <h1 class="text-2xl font-bold text-white mb-6">Admin - Items</h1>

    <div
      v-if="global.isLoading"
      class="text-white/70 py-8"
    >
      Caricamento...
    </div>

    <template v-else>
      <Pagination
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        class="mb-6"
        @go-to-page="goToPage"
      />
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <article
          v-for="item in paginatedItems"
          :key="item.id"
          class="flex flex-col gap-3 p-4 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
        >
          <div class="flex gap-2 w-full">
            <router-link
              :to="`/detail/${item.id}`"
              class="flex-1 min-w-0 aspect-square rounded overflow-hidden hover:ring-2 hover:ring-[#FF7230] transition-shadow cursor-pointer"
            >
              <img
                v-if="item.image_source_url"
                :src="item.image_source_url"
                alt="originale"
                class="w-full h-full object-cover block"
              />
              <span v-else class="flex items-center justify-center w-full h-full min-h-[60px] bg-white/10 text-white/50 text-xs">-</span>
            </router-link>
            <div class="flex-1 min-w-0 aspect-square rounded overflow-hidden bg-white/5">
              <img
                v-if="item.image_processed_url"
                :src="item.image_processed_url"
                alt="processata"
                class="w-full h-full object-cover block"
              />
              <span v-else class="flex items-center justify-center w-full h-full min-h-[60px] text-white/50 text-xs">-</span>
            </div>
          </div>
          <div class="flex flex-col gap-0.5 text-xs sm:text-sm">
            <span>{{ formatTimestamp(item.timestamp) }}</span>
            <span class="text-white/70">{{ item.edition || '-' }}</span>
          </div>
          <button
            type="button"
            @click="deleteItem(item)"
            class="text-red-400 hover:text-red-300 hover:underline cursor-pointer text-xs sm:text-sm self-start"
          >
            delete
          </button>
        </article>
      </div>

      <Pagination
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        class="mt-6"
        @go-to-page="goToPage"
      />
    </template>
  </div>
</template>
