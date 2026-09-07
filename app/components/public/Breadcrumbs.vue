<script setup lang="ts">
defineProps<{ items: Array<{ name: string; path: string }> }>()
</script>

<template>
  <nav aria-label="Migas de pan">
    <ol class="flex flex-wrap items-center gap-2 text-sm text-slate-400">
      <li v-for="(item, index) in items" :key="item.path" class="flex items-center gap-2">
        <span v-if="index" aria-hidden="true">/</span>
        <NuxtLink v-if="index < items.length - 1" :to="item.path" class="transition hover:text-cyan-300">
          {{ item.name }}
        </NuxtLink>
        <span v-else aria-current="page" class="text-slate-200">{{ item.name }}</span>
      </li>
    </ol>
  </nav>
</template>
