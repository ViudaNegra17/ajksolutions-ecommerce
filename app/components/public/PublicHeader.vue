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
const categoryLinks = computed(() =>
  categories.value.map((category) => ({
    label: category.name,
    to: '/categoria/' + category.slug
  }))
)
watch(
  () => route.fullPath,
  () => (mobileOpen.value = false)
)
onMounted(() => cart.hydrate())
</script>

<template>
  <a href="#main-content" class="skip-link">Saltar al contenido</a>
  <header class="sticky top-0 z-40 border-b border-default bg-default/95 backdrop-blur">
    <UContainer>
      <div class="flex min-h-20 items-center gap-3 lg:gap-8">
        <NuxtLink to="/" aria-label="AJKSolutionS, inicio" class="shrink-0"><AppLogo /></NuxtLink>
        <div class="hidden min-w-0 flex-1 lg:block"><PublicSearchBox /></div>
        <NuxtLink
          to="/carrito"
          class="relative ml-auto grid size-11 shrink-0 place-items-center rounded-xl border border-default text-primary"
          aria-label="Carrito"
        >
          <UIcon name="i-lucide-shopping-cart" class="size-5" />
          <span
            v-if="cart.hydrated && cart.itemCount"
            data-testid="cart-count"
            class="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-center text-xs font-bold text-white"
            >{{ cart.itemCount }}</span
          >
        </NuxtLink>
        <USlideover
          v-model:open="mobileOpen"
          title="Explorar AJKSolutionS"
          description="Productos, servicios y categorías"
          :close="{ label: 'Cerrar menú' }"
        >
          <UButton
            class="lg:hidden"
            icon="i-lucide-menu"
            color="neutral"
            variant="outline"
            aria-label="Abrir menú"
          />
          <template #body>
            <nav aria-label="Navegación móvil">
              <NuxtLink class="public-mobile-link" to="/productos">Productos</NuxtLink>
              <NuxtLink class="public-mobile-link" to="/servicios">Servicios</NuxtLink>
              <NuxtLink class="public-mobile-link" to="/productos?featured=true">Destacados</NuxtLink>
              <p class="mb-2 mt-6 px-3 text-sm font-semibold text-muted">Categorías</p>
              <ul>
                <PublicCategoryNavNode
                  v-for="category in categories"
                  :key="category.slug"
                  :category="category"
                />
              </ul>
            </nav>
          </template>
        </USlideover>
      </div>
      <div class="pb-3 lg:hidden"><PublicSearchBox /></div>
      <nav
        class="hidden items-center gap-2 border-t border-default py-1 lg:flex"
        aria-label="Navegación principal"
      >
        <UDropdownMenu :items="categoryLinks" :content="{ align: 'start' }">
          <UButton
            label="Categorías"
            icon="i-lucide-layout-grid"
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-chevron-down"
          />
        </UDropdownMenu>
        <NuxtLink class="public-nav-link" to="/productos">Productos</NuxtLink>
        <NuxtLink class="public-nav-link" to="/servicios">Servicios</NuxtLink>
        <NuxtLink class="public-nav-link" to="/productos?featured=true">Destacados</NuxtLink>
        <span class="ml-auto text-xs text-muted">Tecnología y atención personalizada</span>
      </nav>
    </UContainer>
  </header>
</template>
