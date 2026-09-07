<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type {
  PublicAttributeFilter,
  PublicBanner,
  PublicCategory,
  PublicProductCard
} from '#shared/types/public-catalog'

type CatalogData = {
  items: PublicProductCard[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
  filters: {
    categories: PublicCategory[]
    brands: Array<{ name: string; slug: string }>
    attributes: PublicAttributeFilter[]
  }
}

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const filterOpen = ref(false)
const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const allowed = [
  'page',
  'pageSize',
  'search',
  'category',
  'brand',
  'priceMode',
  'availability',
  'featured',
  'sort',
  'minPrice',
  'maxPrice',
  'attributes'
]
const apiQuery = computed(() =>
  Object.fromEntries(
    allowed.flatMap((key) =>
      typeof route.query[key] === 'string' && route.query[key] ? [[key, route.query[key]]] : []
    )
  )
)
const { data, status, error, refresh } = await useAsyncData(
  'public-catalog',
  () => $fetch<ApiSuccess<CatalogData>>('/api/products', { query: apiQuery.value }),
  { watch: [() => route.fullPath] }
)
const catalog = computed(() => data.value?.data)
const { data: bannerData } = await useAsyncData('products-top-banners', () =>
  $fetch<ApiSuccess<PublicBanner[]>>('/api/banners', { query: { placement: 'PRODUCTS_TOP' } })
)
const topBanners = computed(() => bannerData.value?.data || [])
const state = computed(() =>
  Object.fromEntries(
    Object.entries(route.query).flatMap(([key, value]) => (typeof value === 'string' ? [[key, value]] : []))
  )
)
watch(
  () => route.query.search,
  (value) => (search.value = typeof value === 'string' ? value : '')
)

function changeFilters(patch: Record<string, string | undefined>) {
  if (patch.__clear) {
    filterOpen.value = false
    return router.push({ path: '/productos' })
  }
  const query = Object.fromEntries(
    Object.entries({ ...state.value, page: '1', ...patch }).filter((entry): entry is [string, string] =>
      Boolean(entry[1])
    )
  )
  filterOpen.value = false
  return router.push({ query })
}
function submitSearch() {
  changeFilters({ search: search.value.trim() || undefined })
}
function goToPage(page: number) {
  router.push({ query: { ...state.value, page: String(page) } })
}

const canonical = `${config.public.appUrl}/productos`
useSeoMeta({
  title: 'Catálogo de productos',
  description: 'Busca, filtra y compara productos tecnológicos disponibles en AjkSolutionS.',
  ogTitle: 'Catálogo de productos · AjkSolutionS',
  ogDescription: 'Productos tecnológicos con precio y disponibilidad comercial.',
  ogUrl: canonical
})
useHead({ link: [{ rel: 'canonical', href: canonical }] })
</script>

<template>
  <UContainer class="py-10 lg:py-14">
    <PublicBreadcrumbs
      :items="[
        { name: 'Inicio', path: '/' },
        { name: 'Productos', path: '/productos' }
      ]"
    />
    <section
      v-for="banner in topBanners"
      :key="`${banner.title}-${banner.imageUrl}`"
      class="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
    >
      <picture class="absolute inset-0">
        <source v-if="banner.mobileImageUrl" :srcset="banner.mobileImageUrl" media="(max-width: 639px)" />
        <img :src="banner.imageUrl" :alt="banner.title" class="h-full w-full object-cover opacity-25" />
      </picture>
      <div class="relative p-6 sm:p-8">
        <p v-if="banner.subtitle" class="text-sm font-semibold text-cyan-300">{{ banner.subtitle }}</p>
        <h2 class="mt-1 text-2xl font-black">{{ banner.title }}</h2>
        <p v-if="banner.description" class="mt-2 max-w-2xl text-slate-300">{{ banner.description }}</p>
        <UButton
          v-if="banner.ctaLabel && banner.ctaUrl"
          :to="banner.ctaUrl"
          :label="banner.ctaLabel"
          class="mt-4"
        />
      </div>
    </section>
    <div class="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 class="text-4xl font-black tracking-tight">Productos</h1>
        <p class="mt-2 text-slate-400">
          {{ catalog ? `${catalog.pagination.total} resultados` : 'Explora el catálogo' }}
        </p>
      </div>
      <form class="flex w-full max-w-xl gap-2" role="search" @submit.prevent="submitSearch">
        <label for="catalog-search" class="sr-only">Buscar en catálogo</label>
        <input
          id="catalog-search"
          v-model="search"
          type="search"
          placeholder="Nombre, SKU, marca o categoría"
          class="public-input"
        />
        <UButton type="submit" label="Buscar" icon="i-lucide-search" />
      </form>
    </div>
    <div class="mt-8 flex items-center justify-between gap-3">
      <UButton
        class="lg:hidden"
        label="Filtros"
        icon="i-lucide-sliders-horizontal"
        color="neutral"
        variant="outline"
        @click="filterOpen = true"
      />
      <label class="ml-auto flex items-center gap-2 text-sm text-slate-400">
        Ordenar
        <select
          :value="state.sort || 'relevance'"
          class="public-select w-auto"
          @change="changeFilters({ sort: ($event.target as HTMLSelectElement).value })"
        >
          <option value="relevance">Relevancia</option>
          <option value="newest">Más recientes</option>
          <option value="price-asc">Precio menor a mayor</option>
          <option value="price-desc">Precio mayor a menor</option>
          <option value="name-asc">Nombre A-Z</option>
        </select>
      </label>
    </div>
    <div class="mt-6 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside
        class="hidden rounded-2xl border border-white/10 bg-slate-900/50 p-5 lg:block"
        aria-label="Filtros"
      >
        <PublicCatalogFilters
          v-if="catalog"
          :categories="catalog.filters.categories"
          :brands="catalog.filters.brands"
          :attributes="catalog.filters.attributes"
          :state="state"
          @update-filters="changeFilters"
        />
      </aside>
      <div>
        <div v-if="status === 'pending'" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <USkeleton v-for="index in 6" :key="index" class="h-[32rem] rounded-2xl" />
        </div>
        <UAlert
          v-else-if="error"
          color="error"
          title="No pudimos cargar los productos"
          description="Revisa los filtros o intenta nuevamente."
          :actions="[{ label: 'Reintentar', onClick: () => refresh() }]"
        />
        <template v-else-if="catalog">
          <PublicProductGrid :products="catalog.items" />
          <nav
            v-if="catalog.pagination.totalPages > 1"
            class="mt-10 flex items-center justify-center gap-3"
            aria-label="Paginación"
          >
            <UButton
              label="Anterior"
              color="neutral"
              variant="outline"
              :disabled="catalog.pagination.page <= 1"
              @click="goToPage(catalog.pagination.page - 1)"
            />
            <span class="text-sm text-slate-400"
              >Página {{ catalog.pagination.page }} de {{ catalog.pagination.totalPages }}</span
            >
            <UButton
              label="Siguiente"
              color="neutral"
              variant="outline"
              :disabled="catalog.pagination.page >= catalog.pagination.totalPages"
              @click="goToPage(catalog.pagination.page + 1)"
            />
          </nav>
        </template>
      </div>
    </div>
    <div
      v-if="filterOpen"
      class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Filtros del catálogo"
    >
      <aside class="ml-auto h-full w-[min(90vw,24rem)] overflow-y-auto bg-slate-950 p-5 shadow-2xl">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-xl font-black">Filtros</h2>
          <button
            type="button"
            class="grid size-11 place-items-center"
            aria-label="Cerrar filtros"
            @click="filterOpen = false"
          >
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>
        <PublicCatalogFilters
          v-if="catalog"
          :categories="catalog.filters.categories"
          :brands="catalog.filters.brands"
          :attributes="catalog.filters.attributes"
          :state="state"
          @update-filters="changeFilters"
        />
      </aside>
    </div>
  </UContainer>
</template>
