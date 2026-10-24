<template>
  <time :datetime="date.toISOString()" :title="formatDateTime(date)">{{ formatRelative(date) }}</time>
</template>

<script setup lang="ts">
import { formatDateTime, formatRelative } from '@/utils/format'

defineProps<{ date: Date }>()
</script>
