<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const route = useRoute()
const title = computed(() => {
  const value = Array.isArray(route.params.slug) ? route.params.slug.at(-1) : route.params.slug
  return String(value || 'Módulo')
    .replaceAll('-', ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
})
useSeoMeta({ title: () => title.value, robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold">
      {{ title }}
    </h1>
    <UEmpty
      class="mt-10"
      icon="i-lucide-construction"
      title="Módulo preparado"
      description="La funcionalidad se implementará en la fase correspondiente del roadmap."
    />
  </div>
</template>
