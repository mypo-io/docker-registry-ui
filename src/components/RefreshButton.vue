<template>
  <button
    :disabled="loading"
    class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all text-sm font-medium disabled:opacity-50 shrink-0"
  >
    <AppIcon name="refresh" class="w-4 h-4" :class="{ 'animate-spin': loading }" />
    Refresh
  </button>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ loading: boolean }>()
</script>
