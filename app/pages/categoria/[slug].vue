<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type { PublicCategory, PublicProductCard } from '#shared/types/public-catalog'
import { buildBreadcrumbStructuredData, serializeJsonLd } from '#shared/utils/public-catalog'

type CategoryDetail = {
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  children: PublicCategory[]
  breadcrumbs: Array<{ name: string; path: string }>
}
type ProductResult = { items: PublicProductCard[]; pagination: { total: number } }

const route = useRoute()
const config = useRuntimeConfig()
const slug = String(route.params.slug)
const [{ data: categoryResponse, error }, { data: productsResponse }] = await Promise.all([
  useAsyncData(`public-category-${slug}`, () =>
    $fetch<ApiSuccess<CategoryDetail>>(`/api/categories/${slug}`)
  ),
  useAsyncData(`public-category-products-${slug}`, () =>
    $fetch<ApiSuccess<ProductResult>>('/api/products', { query: { category: slug, pageSize: 24 } })
  )
])
if (error.value)
  throw createError({
    statusCode: error.value.statusCode || 500,
    statusMessage:
      error.value.statusCode === 404 ? 'Categoría no encontrada' : 'No se pudo cargar la categoría'
  })
const category = computed(() => categoryResponse.value!.data)
const products = computed(() => productsResponse.value?.data.items || [])
const canonical = `${config.public.appUrl}/categoria/${slug}`

useSeoMeta({
  title: () => category.value.name,
  description: () =>
    category.value.description || `Explora productos de ${category.value.name} en AjkSolutionS.`,
  ogTitle: () => `${category.value.name} · AjkSolutionS`,
  ogDescription: () => category.value.description || `Productos de la categoría ${category.value.name}.`,
  ogUrl: canonical,
  ogImage: () => category.value.imageUrl || undefined
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: serializeJsonLd(
        buildBreadcrumbStructuredData(category.value.breadcrumbs, String(config.public.appUrl))
      )
    }
  ]
}))
</script>

<template>
  <UContainer class="py-10 lg:py-14">
    <PublicBreadcrumbs :items="category.breadcrumbs" />
    <div class="mt-8 max-w-3xl">
      <h1 class="text-4xl font-black tracking-tight sm:text-5xl">{{ category.name }}</h1>
      <p v-if="category.description" class="mt-4 text-lg leading-8 text-slate-300">
        {{ category.description }}
      </p>
    </div>
    <section v-if="category.children.length" class="mt-12" aria-labelledby="subcategories">
      <h2 id="subcategories" class="mb-6 text-2xl font-black">Subcategorías</h2>
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PublicCategoryCard v-for="child in category.children" :key="child.slug" :category="child" />
      </div>
    </section>
    <section class="mt-14" aria-labelledby="category-products">
      <div class="mb-6 flex items-center justify-between">
        <h2 id="category-products" class="text-2xl font-black">Productos</h2>
        <UButton
          :to="{ path: '/productos', query: { category: category.slug } }"
          label="Ver con filtros"
          variant="ghost"
          trailing
          icon="i-lucide-arrow-right"
        />
      </div>
      <PublicProductGrid :products="products" />
    </section>
  </UContainer>
</template>
