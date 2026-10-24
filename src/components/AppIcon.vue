<template>
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" :stroke-width="strokeWidth" :d="ICONS[name]" />
  </svg>
</template>

<script setup lang="ts">
import { ICONS, type IconName } from '@/constants/icons.const'

withDefaults(defineProps<{ name: IconName; strokeWidth?: number }>(), { strokeWidth: 2 })
</script>
