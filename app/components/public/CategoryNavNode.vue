<script setup lang="ts">
import type { PublicCategory } from '#shared/types/public-catalog'

defineOptions({ name: 'PublicCategoryNavNode' })
defineProps<{ category: PublicCategory }>()
</script>

<template>
  <li>
    <NuxtLink
      :to="`/categoria/${category.slug}`"
      class="block rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400"
    >
      {{ category.name }}
    </NuxtLink>
    <ul v-if="category.children.length" class="ml-3 border-l border-white/10 pl-2">
      <PublicCategoryNavNode v-for="child in category.children" :key="child.slug" :category="child" />
    </ul>
  </li>
</template>
