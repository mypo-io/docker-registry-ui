<template>
  <div>
    <div class="flex items-center gap-2 text-sm text-gray-500 mb-6">
      <RouterLink to="/" class="hover:text-white transition-colors">Repositories</RouterLink>
      <AppIcon name="chevronRight" class="w-3 h-3" />
      <span class="text-white font-mono truncate">{{ repo.full }}</span>
    </div>

    <div class="flex items-start justify-between gap-4 mb-6">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold font-mono tracking-tight truncate">{{ repo.name }}</h1>
        <p class="text-gray-500 text-sm mt-1 font-mono">{{ repo.namespace }}</p>
      </div>
      <RefreshButton :loading="loading" @click="load" />
    </div>

    <ErrorAlert v-if="error" :message="error" />

    <div v-if="tags.length" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div v-for="stat in stats" :key="stat.label" class="rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3 min-w-0">
        <p class="text-[11px] uppercase tracking-widest text-gray-500 font-medium">{{ stat.label }}</p>
        <p class="mt-1 text-sm font-mono text-white truncate" :title="stat.title">
          <RelativeTime v-if="stat.date" :date="stat.date" />
          <template v-else>{{ stat.value }}</template>
        </p>
      </div>
    </div>

    <div v-if="loading && !tags.length" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-14 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
    </div>

    <div v-else-if="!tags.length && !loading" class="text-center text-gray-600 py-24">
      <p class="text-lg font-medium text-gray-500">No tags found</p>
    </div>

    <div v-else>
      <div class="flex items-center justify-between gap-4 mb-3">
        <span class="text-xs text-gray-500 font-medium uppercase tracking-widest shrink-0">
          {{ visibleTags.length === tags.length ? pluralize(tags.length, 'tag') : `${visibleTags.length} of ${pluralize(tags.length, 'tag')}` }}
        </span>
        <SearchInput v-model="filter" placeholder="Filter tags…" class="w-full max-w-xs" />
      </div>

      <div class="rounded-2xl border border-gray-800 overflow-hidden divide-y divide-gray-800/60">
        <div
          v-for="tag in visibleTags"
          :key="tag"
          class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-3.5 bg-gray-900/60 hover:bg-gray-800/40 transition-colors"
        >
          <div class="flex items-center gap-2 min-w-0 flex-wrap">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border shrink-0 max-w-full truncate"
              :class="tag === LATEST_TAG
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'"
            >
              {{ tag }}
            </span>
            <span
              v-for="alias in aliasesOf(tag)"
              :key="alias"
              class="text-[11px] font-mono text-gray-500 px-1.5 py-0.5 rounded border border-gray-800"
              title="Same image"
            >
              = {{ alias }}
            </span>
          </div>

          <div class="flex items-center gap-4 ml-auto text-xs text-gray-500">
            <template v-if="details[tag]">
              <button
                class="hidden lg:inline font-mono text-gray-600 hover:text-gray-300 transition-colors"
                :title="`Copy ${details[tag]!.digest}`"
                @click="copy(`${REGISTRY_HOST}/${repo.full}@${details[tag]!.digest}`, `${tag}@digest`)"
              >
                {{ copied === `${tag}@digest` ? 'Copied!' : shortDigest(details[tag]!.digest) }}
              </button>
              <span
                v-if="details[tag]!.platforms.length"
                class="hidden xl:inline font-mono text-gray-600"
              >
                {{ details[tag]!.platforms.join(', ') }}
              </span>
              <span class="hidden md:inline w-16 text-right">{{ formatBytes(details[tag]!.size) }}</span>
              <span class="hidden sm:inline w-24">
                <RelativeTime v-if="details[tag]!.createdAt" :date="details[tag]!.createdAt!" />
              </span>
            </template>
            <div v-else-if="!(tag in details)" class="hidden sm:block h-4 w-40 bg-gray-800/70 rounded animate-pulse" />

            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono whitespace-nowrap text-gray-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all"
              @click="copy(`docker pull ${REGISTRY_HOST}/${repo.full}:${tag}`, tag)"
            >
              <AppIcon name="copy" class="w-3.5 h-3.5" />
              {{ copied === tag ? 'Copied!' : 'docker pull' }}
            </button>

            <button
              v-if="confirmDelete !== tag"
              title="Delete tag"
              class="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-800/40 transition-all"
              @click="confirmDelete = tag"
            >
              <AppIcon name="trash" class="w-4 h-4" />
            </button>

            <div v-else class="flex items-center gap-1.5">
              <span class="text-red-400">
                Delete{{ aliasesOf(tag).length ? ` with ${aliasesOf(tag).join(', ')}` : '' }}?
              </span>
              <button
                :disabled="deleting === tag"
                class="px-2.5 py-1 rounded-lg font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white transition-colors"
                @click="doDelete(tag)"
              >
                {{ deleting === tag ? '…' : 'Yes' }}
              </button>
              <button
                class="px-2.5 py-1 rounded-lg font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                @click="confirmDelete = ''"
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
      class="fixed bottom-6 right-6 left-6 sm:left-auto flex items-start gap-3 max-w-md bg-gray-900 border border-red-800/60 rounded-xl px-4 py-3 shadow-2xl"
    >
      <AppIcon name="alert" class="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <div>
        <p class="text-sm font-medium text-red-400">Delete failed</p>
        <p class="text-xs text-gray-400 mt-0.5">{{ deleteError }}</p>
      </div>
      <button class="text-gray-600 hover:text-gray-400 ml-2" @click="deleteError = ''">
        <AppIcon name="close" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { fetchTags, fetchImageDetails, deleteTag, type ImageDetails } from '@/api/registry'
import {
  COPY_FEEDBACK_MS,
  DELETE_ERROR_TIMEOUT_MS,
  DETAILS_CONCURRENCY,
  LATEST_TAG,
  REGISTRY_HOST,
} from '@/constants/registry.const'
import { forEachConcurrent, newestVersion, sortTags, splitRepository } from '@/utils/repository'
import { errorMessage, formatBytes, formatDateTime, pluralize, shortDigest } from '@/utils/format'
import AppIcon from '@/components/AppIcon.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import RelativeTime from '@/components/RelativeTime.vue'
import SearchInput from '@/components/SearchInput.vue'

interface Stat {
  label: string
  value?: string
  date?: Date
  title?: string
}

const route = useRoute()

const repo = computed(() => {
  const p = route.params.name
  return splitRepository(Array.isArray(p) ? p.join('/') : (p ?? ''))
})

const tags = ref<string[]>([])
/** Missing key = still loading, `null` = failed to load. */
const details = reactive<Record<string, ImageDetails | null>>({})
const loading = ref(false)
const error = ref('')
const filter = ref('')
const copied = ref('')
const confirmDelete = ref('')
const deleting = ref('')
const deleteError = ref('')

const sortedTags = computed(() => sortTags(tags.value))

const visibleTags = computed(() => {
  const q = filter.value.toLowerCase()
  return q ? sortedTags.value.filter((t) => t.toLowerCase().includes(q)) : sortedTags.value
})

const tagsByDigest = computed(() => {
  const map: Record<string, string[]> = {}
  for (const tag of sortedTags.value) {
    const digest = details[tag]?.digest
    if (digest) (map[digest] ??= []).push(tag)
  }
  return map
})

/** Other tags pointing at the same manifest — deleting one deletes them all. */
function aliasesOf(tag: string): string[] {
  const digest = details[tag]?.digest
  return digest ? (tagsByDigest.value[digest] ?? []).filter((t) => t !== tag) : []
}

const deployed = computed(() => details[LATEST_TAG] ?? details[newestVersion(tags.value) ?? ''] ?? null)

const stats = computed<Stat[]>(() => {
  const newest = newestVersion(tags.value)
  const createdAt = deployed.value?.createdAt
  return [
    { label: 'Newest tag', value: newest ?? '—', title: newest ?? undefined },
    createdAt
      ? { label: 'Last build', date: createdAt, title: formatDateTime(createdAt) }
      : { label: 'Last build', value: '—' },
    { label: 'Image size', value: deployed.value ? formatBytes(deployed.value.size) : '—' },
    { label: 'Tags', value: String(tags.value.length) },
  ]
})

function loadDetails(list: string[]): Promise<void> {
  return forEachConcurrent(list, DETAILS_CONCURRENCY, async (tag) => {
    try {
      details[tag] = await fetchImageDetails(repo.value.full, tag)
    } catch {
      details[tag] = null
    }
  })
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  for (const key of Object.keys(details)) delete details[key]
  try {
    tags.value = await fetchTags(repo.value.full)
    void loadDetails(sortTags(tags.value))
  } catch (e) {
    tags.value = []
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

async function copy(text: string, key: string): Promise<void> {
  await navigator.clipboard.writeText(text)
  copied.value = key
  setTimeout(() => (copied.value = ''), COPY_FEEDBACK_MS)
}

async function doDelete(tag: string): Promise<void> {
  deleting.value = tag
  deleteError.value = ''
  try {
    const removed = new Set([tag, ...aliasesOf(tag)])
    await deleteTag(repo.value.full, tag)
    tags.value = tags.value.filter((t) => !removed.has(t))
    for (const t of removed) delete details[t]
  } catch (e) {
    deleteError.value = errorMessage(e)
    setTimeout(() => (deleteError.value = ''), DELETE_ERROR_TIMEOUT_MS)
  } finally {
    confirmDelete.value = ''
    deleting.value = ''
  }
}

watch(() => repo.value.full, load, { immediate: true })
</script>
