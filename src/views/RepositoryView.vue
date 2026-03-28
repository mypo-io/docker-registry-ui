<template>
  <div>
    <div class="flex items-center gap-2 text-sm text-gray-500 mb-6">
      <RouterLink to="/" class="hover:text-white transition-colors">Repositories</RouterLink>
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
      <span class="text-white font-mono">{{ name }}</span>
    </div>

    <div class="flex items-start justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold font-mono tracking-tight">{{ imageName }}</h1>
        <p class="text-gray-500 text-sm mt-1 font-mono">{{ namespace }}</p>
      </div>
      <button
        @click="load"
        :disabled="loading"
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all text-sm font-medium disabled:opacity-50 shrink-0"
      >
        <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Refresh
      </button>
    </div>

    <div v-if="error" class="flex items-center gap-3 text-red-400 text-sm bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 mb-6">
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      {{ error }}
    </div>

    <div v-if="loading && !tags.length" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-14 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
    </div>

    <div v-else-if="!tags.length && !loading" class="text-center text-gray-600 py-24">
      <p class="text-lg font-medium text-gray-500">No tags found</p>
    </div>

    <div v-else>
      <span class="text-xs text-gray-500 font-medium uppercase tracking-widest block mb-3">
        {{ tags.length }} tags
      </span>

      <div class="rounded-2xl border border-gray-800 overflow-hidden divide-y divide-gray-800/60">
        <div
          v-for="tag in sortedTags"
          :key="tag"
          class="flex items-center justify-between px-5 py-3.5 bg-gray-900/60 hover:bg-gray-800/40 transition-colors group"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span
              v-if="tag === 'latest'"
              class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0"
            >
              latest
            </span>
            <span
              v-else
              class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0"
            >
              {{ tag }}
            </span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              @click="copyPullCmd(tag)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-gray-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              {{ copied === tag ? 'Copied!' : 'docker pull' }}
            </button>

            <button
              v-if="confirmDelete !== tag"
              @click="confirmDelete = tag"
              title="Delete tag"
              class="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-800/40 transition-all"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>

            <div v-else class="flex items-center gap-1.5">
              <span class="text-xs text-red-400">Delete?</span>
              <button
                @click="doDelete(tag)"
                :disabled="deleting === tag"
                class="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white transition-colors"
              >
                {{ deleting === tag ? '…' : 'Yes' }}
              </button>
              <button
                @click="confirmDelete = ''"
                class="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
              >
                No
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="deleteError"
      class="fixed bottom-6 right-6 flex items-start gap-3 max-w-md bg-gray-900 border border-red-800/60 rounded-xl px-4 py-3 shadow-2xl"
    >
      <svg class="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <div>
        <p class="text-sm font-medium text-red-400">Delete failed</p>
        <p class="text-xs text-gray-400 mt-0.5">{{ deleteError }}</p>
      </div>
      <button @click="deleteError = ''" class="text-gray-600 hover:text-gray-400 ml-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { fetchTags, deleteTag } from '@/api/registry'

const route = useRoute()

/** Full repository path, e.g. `mypo-io/mypo-landing` */
const name = computed<string>(() => {
  const p = route.params.name
  return Array.isArray(p) ? p.join('/') : (p ?? '')
})

/** Namespace prefix before the first `/`, empty for root repositories */
const namespace = computed(() => {
  const i = name.value.indexOf('/')
  return i !== -1 ? name.value.slice(0, i) : ''
})

/** Repository name without the namespace prefix */
const imageName = computed(() => {
  const i = name.value.indexOf('/')
  return i !== -1 ? name.value.slice(i + 1) : name.value
})

const tags = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const copied = ref('')
const confirmDelete = ref('')
const deleting = ref('')
const deleteError = ref('')

/**
 * Tags sorted with `latest` first, then numerically descending.
 * Numeric comparison handles semver-like tags such as `1.2.0` vs `1.10.0`.
 */
const sortedTags = computed(() =>
  [...tags.value].sort((a, b) => {
    if (a === 'latest') return -1
    if (b === 'latest') return 1
    return b.localeCompare(a, undefined, { numeric: true })
  }),
)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    tags.value = await fetchTags(name.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/** Copies the full `docker pull` command for the given tag to the clipboard. */
async function copyPullCmd(tag: string): Promise<void> {
  const host = new URL(import.meta.env.VITE_REGISTRY_URL).host
  await navigator.clipboard.writeText(`docker pull ${host}/${name.value}:${tag}`)
  copied.value = tag
  setTimeout(() => (copied.value = ''), 2000)
}

async function doDelete(tag: string): Promise<void> {
  deleting.value = tag
  deleteError.value = ''
  try {
    await deleteTag(name.value, tag)
    tags.value = tags.value.filter((t) => t !== tag)
    confirmDelete.value = ''
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : String(e)
    confirmDelete.value = ''
    setTimeout(() => (deleteError.value = ''), 8000)
  } finally {
    deleting.value = ''
  }
}

onMounted(load)
</script>
