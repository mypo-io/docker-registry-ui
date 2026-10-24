<template>
  <div class="relative">
    <AppIcon name="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
    <input
      ref="input"
      v-model="model"
      type="search"
      :placeholder="placeholder"
      class="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
      @keydown.esc="model = ''"
    />
    <kbd class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-600 border border-gray-700 rounded px-1.5 py-0.5 pointer-events-none">/</kbd>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import AppIcon from './AppIcon.vue'

defineProps<{ placeholder: string }>()
const model = defineModel<string>({ required: true })
const input = useTemplateRef('input')

function focusOnSlash(e: KeyboardEvent): void {
  const target = e.target as HTMLElement
  if (e.key !== '/' || target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  e.preventDefault()
  input.value?.focus()
}

onMounted(() => window.addEventListener('keydown', focusOnSlash))
onUnmounted(() => window.removeEventListener('keydown', focusOnSlash))
</script>
