<script setup lang="ts">
import type { PublicCategory } from '#shared/types/public-catalog'

defineProps<{ category: PublicCategory }>()
</script>

<template>
  <NuxtLink
    :to="`/categoria/${category.slug}`"
    class="group relative min-h-48 overflow-hidden rounded-2xl border border-default bg-default p-6 transition hover:border-primary"
  >
    <NuxtImg
      v-if="category.imageUrl"
      :src="category.imageUrl"
      :alt="category.name"
      width="480"
      height="300"
      format="webp"
      loading="lazy"
      class="absolute inset-0 h-full w-full object-cover opacity-30 transition group-hover:scale-105 group-hover:opacity-40"
    />
    <div
      v-if="category.imageUrl"
      class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"
    />
    <div v-else class="absolute inset-0 bg-gradient-to-br from-ajk-50 via-white to-muted" />
    <div class="relative flex h-full flex-col justify-end">
      <UIcon :name="category.icon || 'i-lucide-box'" class="mb-5 size-8 text-primary" />
      <h3 class="text-xl font-black" :class="category.imageUrl ? 'text-white' : 'text-highlighted'">
        {{ category.name }}
      </h3>
      <p class="mt-1 text-sm" :class="category.imageUrl ? 'text-slate-200' : 'text-muted'">
        {{ category.children.length ? `${category.children.length} subcategorías` : 'Explorar productos' }}
      </p>
    </div>
  </NuxtLink>
</template>
