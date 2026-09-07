<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type { PublicCategory } from '#shared/types/public-catalog'

const mobileOpen = ref(false)
const cart = useCartStore()
const route = useRoute()
const { data } = await useAsyncData('public-navigation', () =>
  $fetch<ApiSuccess<PublicCategory[]>>('/api/categories')
)
const categories = computed(() => data.value?.data || [])
watch(
  () => route.fullPath,
  () => (mobileOpen.value = false)
)
onMounted(() => cart.hydrate())
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl">
    <UContainer>
      <div class="flex h-16 items-center gap-3">
        <NuxtLink to="/" class="flex shrink-0 items-center gap-2 font-black tracking-tight">
          <span class="grid size-9 place-items-center rounded-xl bg-cyan-400 text-slate-950">A</span>
          <span class="hidden sm:inline">AjkSolutionS</span>
        </NuxtLink>
        <div class="mx-auto hidden max-w-xl flex-1 lg:block">
          <PublicSearchBox />
        </div>
        <nav class="ml-auto hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          <details class="group relative">
            <summary
              class="cursor-pointer list-none rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              Categorías
            </summary>
            <div
              class="absolute right-0 top-11 hidden w-80 rounded-xl border border-white/10 bg-slate-900 p-3 shadow-2xl group-open:block"
            >
              <ul>
                <PublicCategoryNavNode
                  v-for="category in categories"
                  :key="category.slug"
                  :category="category"
                />
              </ul>
            </div>
          </details>
          <NuxtLink class="public-nav-link" to="/productos">Productos</NuxtLink>
          <NuxtLink class="public-nav-link" to="/servicios">Servicios</NuxtLink>
          <NuxtLink class="public-nav-link" to="/productos?featured=true">Destacados</NuxtLink>
        </nav>
        <NuxtLink
          to="/carrito"
          class="relative grid size-11 shrink-0 place-items-center rounded-xl border border-white/15"
          aria-label="Carrito"
        >
          <UIcon name="i-lucide-shopping-cart" class="size-5" />
          <span
            v-if="cart.hydrated && cart.itemCount"
            data-testid="cart-count"
            class="absolute -right-1 -top-1 min-w-5 rounded-full bg-cyan-400 px-1 text-center text-xs font-black text-slate-950"
            >{{ cart.itemCount }}</span
          >
        </NuxtLink>
        <button
          type="button"
          class="ml-auto grid size-11 place-items-center rounded-xl border border-white/15 lg:hidden"
          :aria-expanded="mobileOpen"
          aria-controls="mobile-navigation"
          aria-label="Abrir menú"
          @click="mobileOpen = !mobileOpen"
        >
          <UIcon :name="mobileOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="size-5" />
        </button>
      </div>
      <div class="pb-3 lg:hidden">
        <PublicSearchBox />
      </div>
    </UContainer>
    <div
      v-if="mobileOpen"
      id="mobile-navigation"
      class="fixed inset-x-0 top-[125px] max-h-[calc(100vh-125px)] overflow-auto border-t border-white/10 bg-slate-950 p-4 shadow-2xl lg:hidden"
    >
      <nav aria-label="Navegación móvil">
        <div class="grid gap-1">
          <NuxtLink class="public-mobile-link" to="/productos">Productos</NuxtLink>
          <NuxtLink class="public-mobile-link" to="/servicios">Servicios</NuxtLink>
          <NuxtLink class="public-mobile-link" to="/productos?featured=true">Destacados</NuxtLink>
        </div>
        <p class="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Categorías</p>
        <ul>
          <PublicCategoryNavNode v-for="category in categories" :key="category.slug" :category="category" />
        </ul>
      </nav>
    </div>
  </header>
</template>
