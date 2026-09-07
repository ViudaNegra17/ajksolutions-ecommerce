<script setup lang="ts">
import type { PublicProductCard } from '#shared/types/public-catalog'

defineProps<{ products: PublicProductCard[] }>()
</script>

<template>
  <div v-if="products.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
    <PublicProductCard v-for="product in products" :key="product.slug" :product="product" />
  </div>
  <UEmpty
    v-else
    icon="i-lucide-package-search"
    title="No encontramos productos"
    description="Prueba cambiando la búsqueda o eliminando algún filtro."
    class="rounded-2xl border border-white/10 bg-slate-900/50 py-16"
  />
</template>
