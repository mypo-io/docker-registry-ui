<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Repositories</h1>
        <p class="text-gray-500 text-sm mt-1">{{ repositories.length }} images across {{ Object.keys(grouped).length }} namespaces</p>
      </div>
      <button
        @click="load"
        :disabled="loading"
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all text-sm font-medium disabled:opacity-50"
      >
        <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Refresh
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="flex items-center gap-3 text-red-400 text-sm bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 mb-6">
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      {{ error }}
    </div>

    <!-- Skeleton -->
    <div v-if="loading && !repositories.length" class="space-y-4">
      <div v-for="i in 2" :key="i" class="bg-gray-900/50 rounded-2xl p-4 border border-gray-800 animate-pulse">
        <div class="h-5 w-32 bg-gray-800 rounded mb-3" />
        <div class="space-y-2">
          <div v-for="j in 3" :key="j" class="h-11 bg-gray-800 rounded-lg" />
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!repositories.length && !loading" class="text-center text-gray-600 py-24">
      <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
      <p class="text-lg font-medium text-gray-500">No repositories found</p>
    </div>

    <!-- Content -->
    <div v-else class="space-y-3">
      <!-- Search -->
      <div class="relative mb-6">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          v-model="search"
          type="search"
          placeholder="Search repositories…"
          class="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
        />
      </div>

      <!-- Namespace groups -->
      <div v-for="(repos, ns) in filteredGrouped" :key="ns" class="rounded-2xl border border-gray-800 overflow-hidden">
        <!-- Namespace header -->
        <button
          class="w-full flex items-center justify-between px-5 py-4 bg-gray-900 hover:bg-gray-800/80 transition-colors"
          @click="toggleNs(ns)"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" :style="{ background: nsColor(ns, 0.15), color: nsColor(ns, 1) }">
              {{ ns.slice(0, 2).toUpperCase() }}
            </div>
            <span class="font-semibold text-white">{{ ns }}</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">{{ repos.length }}</span>
          </div>
          <svg class="w-4 h-4 text-gray-500 transition-transform duration-200" :class="{ 'rotate-180': !collapsed[ns] }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        <!-- Repos list -->
        <div v-show="!collapsed[ns]" class="divide-y divide-gray-800/60">
          <RouterLink
            v-for="repo in repos"
            :key="repo.full"
            :to="`/repository/${repo.full}`"
            class="flex items-center justify-between px-5 py-3.5 bg-gray-900/40 hover:bg-gray-800/60 transition-colors group"
          >
            <div class="flex items-center gap-3 min-w-0">
              <svg class="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              <span class="text-sm font-mono text-gray-300 group-hover:text-white transition-colors truncate">{{ repo.name }}</span>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-400 transition-all group-hover:translate-x-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchCatalog } from '@/api/registry'

const repositories = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const collapsed = reactive<Record<string, boolean>>({})

// Group repos by namespace (prefix before first /)
const grouped = computed(() => {
  const groups: Record<string, { full: string; name: string }[]> = {}
  for (const r of repositories.value) {
    const slashIdx = r.indexOf('/')
    const ns = slashIdx !== -1 ? r.slice(0, slashIdx) : '(root)'
    const name = slashIdx !== -1 ? r.slice(slashIdx + 1) : r
    if (!groups[ns]) groups[ns] = []
    groups[ns].push({ full: r, name })
  }
  return groups
})

const filteredGrouped = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return grouped.value
  const result: typeof grouped.value = {}
  for (const [ns, repos] of Object.entries(grouped.value)) {
    const matched = repos.filter((r) => r.full.toLowerCase().includes(q) || ns.toLowerCase().includes(q))
    if (matched.length) result[ns] = matched
  }
  return result
})

function toggleNs(ns: string) {
  collapsed[ns] = !collapsed[ns]
}

// Deterministic color from namespace name
function nsColor(ns: string, alpha: number): string {
  let hash = 0
  for (let i = 0; i < ns.length; i++) hash = ns.charCodeAt(i) + ((hash << 5) - hash)
  const h = Math.abs(hash) % 360
  return `hsla(${h}, 65%, 60%, ${alpha})`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    repositories.value = await fetchCatalog()
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
