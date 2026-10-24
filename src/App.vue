<template>
  <div class="min-h-screen bg-gray-950 text-gray-100">
    <header class="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <RouterLink to="/" class="flex items-center gap-2.5 group">
          <div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
            <AppIcon name="box" class="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span class="font-semibold text-white text-sm block leading-none">Docker Registry</span>
            <span class="text-gray-600 text-xs font-mono leading-none">{{ REGISTRY_HOST }}</span>
          </div>
        </RouterLink>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-6 py-8">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { REGISTRY_HOST } from '@/constants/registry.const'
</script>
