<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Repositories</h1>
        <p class="text-gray-500 text-sm mt-1">
          {{ repositories.length }}{{ hasMore ? '+' : '' }} images across {{ pluralize(groups.length, 'namespace') }}
        </p>
      </div>
      <RefreshButton :loading="loading" @click="reload" />
    </div>

    <ErrorAlert v-if="error" :message="error" />

    <div v-if="loading && !repositories.length" class="space-y-4">
      <div v-for="i in 2" :key="i" class="bg-gray-900/50 rounded-2xl p-4 border border-gray-800 animate-pulse">
        <div class="h-5 w-32 bg-gray-800 rounded mb-3" />
        <div class="space-y-2">
          <div v-for="j in 3" :key="j" class="h-11 bg-gray-800 rounded-lg" />
        </div>
      </div>
    </div>

    <div v-else-if="!repositories.length && !loading" class="text-center text-gray-600 py-24">
      <AppIcon name="box" :stroke-width="1.5" class="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p class="text-lg font-medium text-gray-500">No repositories found</p>
    </div>

    <div v-else class="space-y-3">
      <div class="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchInput v-model="search" placeholder="Search repositories…" class="flex-1" />
        <div class="flex rounded-xl border border-gray-800 bg-gray-900 p-1 text-xs font-medium shrink-0">
          <button
            v-for="(label, mode) in SORT_LABELS"
            :key="mode"
            class="flex-1 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
            :class="sort === mode ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'"
            @click="sort = mode"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <div v-for="group in filteredGroups" :key="group.namespace" class="rounded-2xl border border-gray-800 overflow-hidden">
        <button
          class="w-full flex items-center justify-between px-5 py-4 bg-gray-900 hover:bg-gray-800/80 transition-colors"
          @click="collapsed[group.namespace] = !collapsed[group.namespace]"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              :style="{ background: nsColor(group.namespace, 0.15), color: nsColor(group.namespace, 1) }"
            >
              {{ group.namespace.slice(0, 2).toUpperCase() }}
            </div>
            <span class="font-semibold text-white">{{ group.namespace }}</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
              {{ group.repos.length }}
            </span>
          </div>
          <AppIcon
            name="chevronDown"
            class="w-4 h-4 text-gray-500 transition-transform duration-200"
            :class="{ 'rotate-180': !collapsed[group.namespace] }"
          />
        </button>

        <div v-show="!collapsed[group.namespace]" class="divide-y divide-gray-800/60">
          <RouterLink
            v-for="repo in group.repos"
            :key="repo.full"
            :to="`/repository/${repo.full}`"
            class="flex items-center justify-between gap-4 px-5 py-3.5 bg-gray-900/40 hover:bg-gray-800/60 transition-colors group"
          >
            <div class="flex items-center gap-3 min-w-0">
              <AppIcon name="box" class="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors shrink-0" />
              <span class="text-sm font-mono text-gray-300 group-hover:text-white transition-colors truncate">{{ repo.name }}</span>
            </div>

            <div class="flex items-center gap-4 shrink-0 text-xs">
              <template v-if="!(repo.full in summaries)">
                <div class="h-5 w-24 bg-gray-800 rounded animate-pulse" />
                <div class="hidden sm:block h-4 w-28 bg-gray-800/70 rounded animate-pulse" />
              </template>
              <span v-else-if="summaries[repo.full]?.tagCount === 0" class="text-gray-600">no tags</span>
              <template v-else-if="summaries[repo.full]">
                <span
                  v-if="summaries[repo.full]!.newestVersion"
                  class="px-2 py-0.5 rounded-md font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 max-w-40 truncate"
                  title="Newest tag"
                >
                  {{ summaries[repo.full]!.newestVersion }}
                </span>
                <span class="hidden sm:flex items-center gap-1.5 text-gray-500 w-28" title="Last build of the deployed tag">
                  <AppIcon name="clock" class="w-3.5 h-3.5 shrink-0" />
                  <RelativeTime v-if="summaries[repo.full]!.updatedAt" :date="summaries[repo.full]!.updatedAt!" />
                  <span v-else>—</span>
                </span>
                <span class="hidden md:inline text-gray-600 w-14 text-right">
                  {{ pluralize(summaries[repo.full]!.tagCount, 'tag') }}
                </span>
              </template>
              <span v-else class="text-gray-700" title="Couldn't load tags">—</span>
              <AppIcon
                name="chevronRight"
                class="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-400 transition-all group-hover:translate-x-0.5"
              />
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- Sentinel element observed by IntersectionObserver to trigger next page load -->
      <div ref="sentinel" class="h-px" />

      <div v-if="loading && repositories.length" class="flex justify-center py-4">
        <AppIcon name="refresh" class="w-5 h-5 text-gray-600 animate-spin" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchCatalogPage, fetchRepositorySummary, type RepositorySummary } from '@/api/registry'
import { CATALOG_PAGE_SIZE, DETAILS_CONCURRENCY } from '@/constants/registry.const'
import { ROOT_NAMESPACE, SORT_LABELS, type SortMode } from '@/constants/catalog.const'
import { forEachConcurrent, splitRepository, type RepositoryName } from '@/utils/repository'
import { errorMessage, pluralize } from '@/utils/format'
import AppIcon from '@/components/AppIcon.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import RelativeTime from '@/components/RelativeTime.vue'
import SearchInput from '@/components/SearchInput.vue'

interface NamespaceGroup {
  namespace: string
  repos: RepositoryName[]
}

const repositories = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const sort = ref<SortMode>('name')
const hasMore = ref(false)
const cursor = ref<string | null>(null)

/** Missing key = still loading, `null` = failed to load. */
const summaries = reactive<Record<string, RepositorySummary | null>>({})

/** true = collapsed */
const collapsed = reactive<Record<string, boolean>>({})

const sentinel = ref<HTMLElement | null>(null)

function updatedAt(full: string): number {
  return summaries[full]?.updatedAt?.getTime() ?? 0
}

const groups = computed<NamespaceGroup[]>(() => {
  const byNamespace: Record<string, RepositoryName[]> = {}
  for (const full of repositories.value) {
    const repo = splitRepository(full)
    ;(byNamespace[repo.namespace || ROOT_NAMESPACE] ??= []).push(repo)
  }
  const result = Object.entries(byNamespace).map(([namespace, repos]) => ({ namespace, repos }))
  if (sort.value === 'name') return result

  for (const g of result) g.repos.sort((a, b) => updatedAt(b.full) - updatedAt(a.full))
  return result.sort((a, b) => updatedAt(b.repos[0]!.full) - updatedAt(a.repos[0]!.full))
})

const filteredGroups = computed<NamespaceGroup[]>(() => {
  const q = search.value.toLowerCase()
  if (!q) return groups.value
  return groups.value
    .map((g) => ({
      namespace: g.namespace,
      repos: g.repos.filter((r) => r.full.toLowerCase().includes(q) || g.namespace.toLowerCase().includes(q)),
    }))
    .filter((g) => g.repos.length)
})

/** Deterministic hue per namespace so the same namespace always gets the same color. */
function nsColor(ns: string, alpha: number): string {
  let hash = 0
  for (let i = 0; i < ns.length; i++) hash = ns.charCodeAt(i) + ((hash << 5) - hash)
  return `hsla(${Math.abs(hash) % 360}, 65%, 60%, ${alpha})`
}

function loadSummaries(names: string[]): Promise<void> {
  return forEachConcurrent(names, DETAILS_CONCURRENCY, async (name) => {
    try {
      summaries[name] = await fetchRepositorySummary(name)
    } catch {
      summaries[name] = null
    }
  })
}

async function loadPage(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const page = await fetchCatalogPage(CATALOG_PAGE_SIZE, cursor.value ?? undefined)
    repositories.value.push(...page.repositories)
    cursor.value = page.nextCursor
    hasMore.value = page.nextCursor !== null
    void loadSummaries(page.repositories)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

function loadMore(): void {
  if (!loading.value && hasMore.value) void loadPage()
}

async function reload(): Promise<void> {
  repositories.value = []
  cursor.value = null
  for (const key of Object.keys(summaries)) delete summaries[key]
  await loadPage()
}

let observer: IntersectionObserver | null = null

onMounted(async () => {
  await reload()

  observer = new IntersectionObserver(
    (entries) => { if (entries[0]?.isIntersecting) loadMore() },
    { rootMargin: '200px' },
  )
  watch(sentinel, (el) => {
    if (el) observer!.observe(el)
  }, { immediate: true })
})

onUnmounted(() => observer?.disconnect())
</script>
