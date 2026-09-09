<script setup lang="ts">
defineProps<{ title: string; description: string }>()
</script>

<template>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-3xl font-bold">{{ title }}</h1>
      <p class="mt-2 text-muted">{{ description }}</p>
    </div>
    <div class="flex gap-2"><slot /></div>
  </div>
</template>
