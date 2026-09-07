<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'

type Suggestions = {
  products: Array<{ name: string; slug: string; image: unknown }>
  categories: Array<{ name: string; slug: string }>
  brands: Array<{ name: string; slug: string }>
}

const route = useRoute()
const query = ref(typeof route.query.search === 'string' ? route.query.search : '')
const suggestions = ref<Suggestions | null>(null)
const open = ref(false)
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined

watch(
  () => route.query.search,
  (value) => {
    if (typeof value === 'string' && value !== query.value) query.value = value
  }
)

watch(query, (value) => {
  clearTimeout(timer)
  controller?.abort()
  suggestions.value = null
  if (value.trim().length < 2) return
  timer = setTimeout(async () => {
    controller = new AbortController()
    loading.value = true
    try {
      const response = await $fetch<ApiSuccess<Suggestions>>('/api/search', {
        query: { q: value.trim() },
        signal: controller.signal
      })
      suggestions.value = response.data
      open.value = true
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) suggestions.value = null
    } finally {
      loading.value = false
    }
  }, 320)
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  controller?.abort()
})

async function submit() {
  const search = query.value.trim()
  open.value = false
  await navigateTo({ path: '/productos', query: search ? { search } : {} })
}

function closeSoon() {
  setTimeout(() => (open.value = false), 160)
}
</script>

<template>
  <form class="relative w-full" role="search" @submit.prevent="submit">
    <label for="public-search" class="sr-only">Buscar productos</label>
    <div class="relative">
      <UIcon
        name="i-lucide-search"
        class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
      />
      <input
        id="public-search"
        v-model="query"
        type="search"
        autocomplete="off"
        placeholder="Buscar productos, marcas o categorías"
        class="h-11 w-full rounded-xl border border-white/15 bg-slate-900/90 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
        @focus="open = Boolean(suggestions)"
        @blur="closeSoon"
      />
      <span
        v-if="loading"
        class="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"
        aria-label="Buscando"
      />
    </div>
    <div
      v-if="open && suggestions"
      class="absolute left-0 right-0 top-12 z-50 max-h-80 overflow-auto rounded-xl border border-white/10 bg-slate-900 p-2 shadow-2xl"
    >
      <p
        v-if="!suggestions.products.length && !suggestions.categories.length && !suggestions.brands.length"
        class="px-3 py-4 text-sm text-slate-400"
      >
        No encontramos coincidencias.
      </p>
      <template v-if="suggestions.products.length">
        <p class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Productos</p>
        <NuxtLink
          v-for="item in suggestions.products"
          :key="item.slug"
          :to="`/productos/${item.slug}`"
          class="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
        >
          {{ item.name }}
        </NuxtLink>
      </template>
      <template v-if="suggestions.categories.length">
        <p class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Categorías</p>
        <NuxtLink
          v-for="item in suggestions.categories"
          :key="item.slug"
          :to="`/categoria/${item.slug}`"
          class="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
        >
          {{ item.name }}
        </NuxtLink>
      </template>
      <template v-if="suggestions.brands.length">
        <p class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Marcas</p>
        <NuxtLink
          v-for="item in suggestions.brands"
          :key="item.slug"
          :to="{ path: '/productos', query: { brand: item.slug } }"
          class="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
        >
          {{ item.name }}
        </NuxtLink>
      </template>
    </div>
  </form>
</template>
