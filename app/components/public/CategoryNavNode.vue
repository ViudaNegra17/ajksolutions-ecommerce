<script setup lang="ts">
import type { PublicCategory } from '#shared/types/public-catalog'

defineOptions({ name: 'PublicCategoryNavNode' })
defineProps<{ category: PublicCategory }>()
</script>

<template>
  <li>
    <NuxtLink
      :to="`/categoria/${category.slug}`"
      class="block rounded-lg px-3 py-2 text-sm text-default transition hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
    >
      {{ category.name }}
    </NuxtLink>
    <ul v-if="category.children.length" class="ml-3 border-l border-default pl-2">
      <PublicCategoryNavNode v-for="child in category.children" :key="child.slug" :category="child" />
    </ul>
  </li>
</template>
