<template>
  <div class="flex items-center gap-3 text-red-400 text-sm bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 mb-6">
    <AppIcon name="alert" class="w-4 h-4 shrink-0" />
    {{ message }}
  </div>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ message: string }>()
</script>
