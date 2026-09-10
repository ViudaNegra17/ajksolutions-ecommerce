<script setup lang="ts">
defineProps<{ title: string; description: string }>()
const isAdminSectionRoot = inject(
  'adminSectionRoot',
  computed(() => false)
)
</script>

<template>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 v-if="!isAdminSectionRoot" class="text-3xl font-bold">{{ title }}</h2>
      <p :class="['text-muted', { 'mt-2': !isAdminSectionRoot }]">{{ description }}</p>
    </div>
    <div class="flex gap-2"><slot /></div>
  </div>
</template>
