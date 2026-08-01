<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import Pagination from './Pagination.vue';
import { ITEM_STATUS } from '../itemStorage.js';

const EDITION_STORE_KEY = 'admin-filter-edition';
const STATUS_STORE_KEY = 'admin-filter-status';
const ALL_STATUS = 'All';

const route = useRoute();
const router = useRouter();
const global = inject('global');
const getStorageUrl = inject('getStorageUrl');

const allItems = ref([]);
const selectedEdition = ref(null);
const selectedStatus = ref(ALL_STATUS);
const isLoading = ref(true);
const currentPage = ref(1);
const itemsPerPage = 10;

const editions = computed(() => {
  const byEdition = new Map();

  for (const item of allItems.value) {
    const edition = item.edition ?? '';
    const ts = item.timestamp?.toMillis?.() ?? 0;
    const existing = byEdition.get(edition);

    if (!existing || ts > existing.latestTs) {
      byEdition.set(edition, { edition, latestTs: ts });
    }
  }

  return [...byEdition.values()]
    .sort((a, b) => b.latestTs - a.latestTs)
    .map(({ edition }) => edition);
});

const statuses = computed(() => {
  const unique = new Set();

  for (const item of allItems.value) {
    if (item.status != null && item.status !== '') {
      unique.add(item.status);
    }
  }

  return [ALL_STATUS, ...[...unique].sort()];
});

const filteredItems = computed(() => {
  let items = allItems.value;

  if (selectedEdition.value !== null) {
    items = items.filter(
      (item) => (item.edition ?? '') === selectedEdition.value
    );
  }

  if (selectedStatus.value !== ALL_STATUS) {
    items = items.filter((item) => item.status === selectedStatus.value);
  }

  return items;
});

const totalPages = computed(() =>
  Math.ceil(filteredItems.value.length / itemsPerPage) || 1
);

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredItems.value.slice(start, start + itemsPerPage);
});

const editionLabel = (edition) => edition || '—';

const initEditionFilter = () => {
  const list = editions.value;
  if (!list.length) {
    selectedEdition.value = null;
    return;
  }

  const stored = global.value.storeValue(EDITION_STORE_KEY);
  selectedEdition.value =
    stored !== null && list.includes(stored) ? stored : list[0];
};

const initStatusFilter = () => {
  const list = statuses.value;
  const stored = global.value.storeValue(STATUS_STORE_KEY);

  selectedStatus.value =
    stored !== null && list.includes(stored) ? stored : ALL_STATUS;
};

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

const statusClass = (status) => {
  if (status === ITEM_STATUS.PROCESSED) return 'bg-[#ceeaee] text-[#201c28]';
  if (status === ITEM_STATUS.FAILED) return 'bg-[#f9cade] text-[#201c28]';
  if (status === ITEM_STATUS.HIDDEN) return 'bg-[#e5e5e5] text-[#525252]';
  return 'bg-[#cfcfcf] text-[#201c28]';
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

const syncPageFromUrl = () => {
  const pageFromUrl = parseInt(route.query.page, 10);
  if (
    !isNaN(pageFromUrl) &&
    pageFromUrl >= 1 &&
    pageFromUrl <= totalPages.value
  ) {
    currentPage.value = pageFromUrl;
  } else if (route.query.page !== undefined) {
    currentPage.value = 1;
    router.replace({
      path: '/admin',
      query: totalPages.value > 1 ? { page: 1 } : {},
    });
  } else if (totalPages.value > 1) {
    router.replace({ path: '/admin', query: { page: 1 } });
  }
};

const loadItems = async () => {
  isLoading.value = true;
  const snapshot = await getDocs(collection(db, 'items'));
  const rawItems = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  allItems.value = await Promise.all(
    rawItems.map(async (item) => ({
      ...item,
      image_source_url: await getImageUrl(item.image_source) ?? item.image_source,
      image_processed_url: await getImageUrl(item.image_processed) ?? item.image_processed,
    }))
  );

  allItems.value.sort((a, b) => {
    const ta = a.timestamp?.toMillis?.() ?? 0;
    const tb = b.timestamp?.toMillis?.() ?? 0;
    return tb - ta;
  });

  initEditionFilter();
  initStatusFilter();
  isLoading.value = false;
  syncPageFromUrl();
};

watch(selectedEdition, (value) => {
  if (value === null || isLoading.value) return;
  global.value.storeValue(EDITION_STORE_KEY, value);
  currentPage.value = 1;
  router.replace({
    path: '/admin',
    query: totalPages.value > 1 ? { page: 1 } : {},
  });
});

watch(selectedStatus, (value, oldValue) => {
  if (isLoading.value || value === oldValue) return;
  global.value.storeValue(STATUS_STORE_KEY, value);
  currentPage.value = 1;
  loadItems();
});

watch(editions, (list) => {
  if (!list.length) {
    selectedEdition.value = null;
    return;
  }
  if (!list.includes(selectedEdition.value)) {
    selectedEdition.value = list[0];
  }
});

watch(statuses, (list) => {
  if (!list.includes(selectedStatus.value)) {
    selectedStatus.value = ALL_STATUS;
  }
});

watch(
  () => route.query.page,
  (pageParam) => {
    if (!pageParam || filteredItems.value.length === 0) return;
    const pageNum = parseInt(pageParam, 10);
    if (
      pageNum >= 1 &&
      pageNum <= totalPages.value &&
      pageNum !== currentPage.value
    ) {
      currentPage.value = pageNum;
    }
  }
);

const hideItem = async (item) => {
  try {
    await updateDoc(doc(db, 'items', item.id), {
      status: ITEM_STATUS.HIDDEN,
    })

    const localItem = allItems.value.find((i) => i.id === item.id)
    if (localItem) {
      localItem.status = ITEM_STATUS.HIDDEN
    }
  } catch (err) {
    console.error('Errore hide:', err)
    alert('Errore durante l\'operazione')
  }
}

const unhideItem = async (item) => {
  try {
    await updateDoc(doc(db, 'items', item.id), {
      status: ITEM_STATUS.PROCESSED,
    })

    const localItem = allItems.value.find((i) => i.id === item.id)
    if (localItem) {
      localItem.status = ITEM_STATUS.PROCESSED
    }
  } catch (err) {
    console.error('Errore unhide:', err)
    alert('Errore durante l\'operazione')
  }
}

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
    if (item.image_framed && item.image_framed.includes('/o/')) {
      try {
        const path = item.image_framed
          .split('/o/')[1]
          ?.split('?')[0]
          ?.replace(/%2F/g, '/');
        if (path) {
          const ref = storageRef(storage, path);
          await deleteObject(ref);
        }
      } catch (e) {
        console.warn('Errore cancellazione storage image_framed:', e);
      }
    }

    allItems.value = allItems.value.filter((i) => i.id !== item.id);
  } catch (err) {
    console.error('Errore eliminazione:', err);
    alert('Errore durante l\'eliminazione');
  }
};

onMounted(loadItems);
</script>

<template>
  <div class="admin container mx-auto w-full max-w-7xl px-[3.5%] py-6 sm:py-8">
    <header class="mb-6 sm:mb-8">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-4">
        <h1 class="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
          Admin
        </h1>
        <select
          v-if="!isLoading && editions.length"
          v-model="selectedEdition"
          class="w-full sm:w-auto sm:min-w-[200px] rounded-lg border border-black/10 bg-white px-3 py-2  font-medium text-[var(--text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7230]"
          aria-label="Filtra per edition"
        >
          <option
            v-for="edition in editions"
            :key="edition"
            :value="edition"
          >
            {{ editionLabel(edition) }}
          </option>
        </select>
        <select
          v-if="!isLoading && statuses.length"
          v-model="selectedStatus"
          class="w-full sm:w-auto sm:min-w-[200px] rounded-lg border border-black/10 bg-white px-3 py-2  font-medium text-[var(--text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7230]"
          aria-label="Filtra per status"
        >
          <option
            v-for="status in statuses"
            :key="status"
            :value="status"
          >
            {{ status }}
          </option>
        </select>
      </div>
      <p v-if="!isLoading" class="mt-1  text-[var(--text-primary)]/60">
        {{ filteredItems.length }} elementi
        <span v-if="selectedEdition !== null"> · {{ editionLabel(selectedEdition) }}</span>
        <span v-if="selectedStatus !== ALL_STATUS"> · {{ selectedStatus }}</span>
      </p>
    </header>

    <div
      v-if="isLoading"
      class="py-16 text-center text-[var(--text-primary)]/60"
    >
      Caricamento...
    </div>

    <template v-else>
      <p
        v-if="filteredItems.length === 0"
        class="py-16 text-center text-[var(--text-primary)]/60"
      >
        Nessun elemento per i filtri selezionati.
      </p>

      <template v-else>
        <Pagination
          v-if="totalPages > 1"
          :current-page="currentPage"
          :total-pages="totalPages"
          class="mb-6"
          @go-to-page="goToPage"
        />

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          <article
            v-for="item in paginatedItems"
            :key="item.id"
            class="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm"
          >
            <div class="flex gap-2 w-full">
              <router-link
                :to="`/detail/${item.id}`"
                class="group flex-1 min-w-0"
              >
                <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-primary)]/50">
                  Originale
                </p>
                <div class="aspect-square overflow-hidden rounded-md bg-[var(--page-bg)] ring-1 ring-black/5 transition-shadow group-hover:ring-2 group-hover:ring-[#FF7230]">
                  <img
                    v-if="item.image_source_url"
                    :src="item.image_source_url"
                    alt="Originale"
                    class="block h-full w-full object-cover"
                  />
                  <span
                    v-else
                    class="flex h-full min-h-[80px] items-center justify-center  text-[var(--text-primary)]/40"
                  >
                    —
                  </span>
                </div>
              </router-link>

              <div class="flex-1 min-w-0">
                <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-primary)]/50">
                  Elaborata
                </p>
                <div class="aspect-square overflow-hidden rounded-md bg-[var(--page-bg)] ring-1 ring-black/5">
                  <img
                    v-if="item.image_processed_url"
                    :src="item.image_processed_url"
                    alt="Elaborata"
                    class="block h-full w-full object-cover"
                  />
                  <span
                    v-else
                    class="flex h-full min-h-[80px] items-center justify-center  text-[var(--text-primary)]/40"
                  >
                    —
                  </span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5  text-[var(--text-primary)]">
              <span class="tabular-nums">{{ formatTimestamp(item.timestamp) }}</span>
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-if="item.status"
                  class="inline-block rounded px-2 py-0.5  font-medium"
                  :class="statusClass(item.status)"
                >
                  {{ item.status }}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-4">
              <button
                v-if="item.status !== ITEM_STATUS.HIDDEN"
                type="button"
                class="font-medium text-neutral-600 hover:underline"
                @click="hideItem(item)"
              >
                Hide
              </button>
              <button
                v-else
                type="button"
                class="font-medium text-neutral-600 hover:underline"
                @click="unhideItem(item)"
              >
                Unhide
              </button>
              <router-link
                :to="{ path: `/detail/${item.id}`, query: { print: '' } }"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-neutral-600 hover:underline"
              >
                Print
              </router-link>
              <button
                type="button"
                class="font-medium text-[#ec1874] hover:underline"
                @click="deleteItem(item)"
              >
                Delete
              </button>
            </div>
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
    </template>
  </div>
</template>
