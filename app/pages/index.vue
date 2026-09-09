<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type {
  PublicBanner,
  PublicCategory,
  PublicProductCard,
  PublicSettings
} from '#shared/types/public-catalog'
import type { PublicServiceCard } from '#shared/types/services'

type HomeData = {
  categories: PublicCategory[]
  brands: Array<{ name: string; slug: string; logoUrl: string | null }>
  featured: PublicProductCard[]
  newest: PublicProductCard[]
  settings: PublicSettings
  services: PublicServiceCard[]
  banners: PublicBanner[]
}

const config = useRuntimeConfig()
const { data, status, error, refresh } = await useAsyncData('public-home', () =>
  $fetch<ApiSuccess<HomeData>>('/api/home')
)
const home = computed(() => data.value?.data)
const hero = computed(() => home.value?.banners.find((banner) => banner.placement === 'HOME_HERO'))
const heroDescription = computed(
  () =>
    hero.value?.description ||
    'Encuentra equipos, accesorios y productos digitales para tu día a día. Completa tu compra o solicita soporte con atención personalizada por WhatsApp.'
)
const secondaryBanners = computed(
  () => home.value?.banners.filter((banner) => banner.placement === 'HOME_SECONDARY') || []
)
const canonical = `${config.public.appUrl}/`

useSeoMeta({
  title: () => home.value?.settings.seo.title || 'Tecnología para impulsar tus proyectos',
  description: () =>
    home.value?.settings.seo.description ||
    'Explora productos físicos, productos digitales y servicios profesionales.',
  ogTitle: () => home.value?.settings.seo.title || 'AjkSolutionS e-Commerce',
  ogDescription: () =>
    home.value?.settings.seo.description || 'Productos tecnológicos y soluciones profesionales.',
  ogUrl: canonical,
  twitterTitle: () => home.value?.settings.seo.title || 'AjkSolutionS e-Commerce',
  twitterDescription: () =>
    home.value?.settings.seo.description || 'Productos tecnológicos y soluciones profesionales.'
})
useHead({ link: [{ rel: 'canonical', href: canonical }] })
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-default bg-ajk-50">
  
  <picture v-if="hero" class="absolute inset-0">
    <source v-if="hero.mobileImageUrl" :srcset="hero.mobileImageUrl" media="(max-width: 639px)" />
    <img :src="hero.imageUrl" :alt="hero.title" class="h-full w-full object-cover opacity-25" />
  </picture>
  <div class="absolute inset-0 bg-gradient-to-r from-white/95 via-white/90 to-white/60" />

  <UContainer class="relative grid items-center gap-8 py-10 lg:grid-cols-12 lg:py-16">
    
    
    <div class="lg:col-span-7">
      <UBadge :label="hero?.subtitle || 'Tecnología para Personas Naturales y Empresas'" variant="soft" />
      
      <h1 class="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        <template v-if="hero">{{ hero.title }}</template>
        <template v-else>
          Tecnología para trabajar, crear y <span class="text-primary">conectar.</span>
        </template>
      </h1>

      <p class="mt-4 max-w-xl text-base leading-7 text-default sm:text-lg">
        {{ heroDescription }}
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <UButton
          :to="hero?.ctaUrl || '/productos'"
          :label="hero?.ctaLabel || 'Explorar productos'"
          size="lg"
          icon="i-lucide-arrow-right"
          trailing
        />
        <UButton to="/servicios" label="Ver servicios" size="lg" color="neutral" variant="outline" />
      </div>
    </div>

    
    <div class="flex flex-col justify-center gap-3.5 sm:grid sm:grid-cols-3 lg:flex lg:flex-col lg:col-span-5">
      <div
        v-for="benefit in [
          [
            'i-lucide-package-check',
            'Disponibilidad clara',
            'Conoce qué puedes recibir y qué podemos conseguir para ti.'
          ],
          [
            'i-lucide-badge-dollar-sign',
            'Precios claros',
            'Revisa el total y las condiciones antes de confirmar tu pedido.'
          ],
          [
            'i-lucide-message-circle',
            'Atención personalizada',
            'Te acompañamos en la compra y el soporte por WhatsApp.'
          ]
        ]"
        :key="benefit[1]"
        class="rounded-xl border border-default bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:bg-gray-900/80"
      >
        <UIcon :name="benefit[0]" class="size-5 text-primary" />
        <p class="mt-2 text-sm font-bold">{{ benefit[1] }}</p>
        <p class="mt-1 text-xs leading-5 text-muted">{{ benefit[2] }}</p>
      </div>
    </div>

  </UContainer>
</section>

    <div v-if="status === 'pending'" class="py-24">
      <UContainer class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <USkeleton v-for="index in 4" :key="index" class="h-52 rounded-2xl" />
      </UContainer>
    </div>
    <UContainer v-else-if="error" class="py-20">
      <UAlert
        color="error"
        title="No pudimos cargar el catálogo"
        description="La página pública sigue disponible. Intenta nuevamente."
        :actions="[{ label: 'Reintentar', onClick: () => refresh() }]"
      />
    </UContainer>
    <template v-else-if="home">
      <section v-if="secondaryBanners.length" class="py-8" aria-label="Novedades">
        <UContainer class="grid gap-5 md:grid-cols-2">
          <article
            v-for="banner in secondaryBanners"
            :key="banner.title"
            class="relative min-h-64 overflow-hidden rounded-3xl border border-default p-7"
          >
            <img
              :src="banner.imageUrl"
              :alt="banner.title"
              class="absolute inset-0 h-full w-full object-cover opacity-25"
            />
            <div class="relative">
              <p v-if="banner.subtitle" class="text-sm font-bold uppercase text-primary">
                {{ banner.subtitle }}
              </p>
              <h2 class="mt-2 text-3xl font-black">{{ banner.title }}</h2>
              <p v-if="banner.description" class="mt-3 max-w-xl text-default">{{ banner.description }}</p>
              <UButton
                v-if="banner.ctaUrl"
                :to="banner.ctaUrl"
                :label="banner.ctaLabel || 'Ver más'"
                class="mt-5"
              />
            </div>
          </article>
        </UContainer>
      </section>
      <section class="py-16" aria-labelledby="home-categories">
        <UContainer>
          <div class="mb-8 flex items-end justify-between gap-4">
            <div>
              <p class="text-sm font-bold uppercase tracking-widest text-primary">Explora</p>
              <h2 id="home-categories" class="mt-2 text-3xl font-black">Categorías</h2>
            </div>
            <UButton
              to="/productos"
              label="Ver catálogo"
              variant="ghost"
              trailing
              icon="i-lucide-arrow-right"
            />
          </div>
          <div v-if="home.categories.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <PublicCategoryCard
              v-for="category in home.categories.slice(0, 8)"
              :key="category.slug"
              :category="category"
            />
          </div>
          <UEmpty
            v-else
            icon="i-lucide-layout-grid"
            title="Aún no hay categorías publicadas"
            description="Vuelve pronto para conocer el catálogo."
          />
        </UContainer>
      </section>

      <section class="border-y border-default bg-default py-16" aria-labelledby="featured-products">
        <UContainer>
          <p class="text-sm font-bold uppercase tracking-widest text-primary">Selección especial</p>
          <h2 id="featured-products" class="mb-8 mt-2 text-3xl font-black">Productos destacados</h2>
          <PublicProductGrid :products="home.featured" />
        </UContainer>
      </section>

      <section class="py-16" aria-labelledby="new-products">
        <UContainer>
          <p class="text-sm font-bold uppercase tracking-widest text-primary">Recién publicados</p>
          <h2 id="new-products" class="mb-8 mt-2 text-3xl font-black">Nuevos productos</h2>
          <PublicProductGrid :products="home.newest" />
        </UContainer>
      </section>

      <section
        v-if="home.services.length"
        class="border-y border-default bg-gradient-to-r from-ajk-50 to-muted py-16"
      >
        <UContainer
          ><div class="mb-8 flex items-end justify-between">
            <div>
              <p class="text-sm font-bold uppercase tracking-widest text-primary">Atención especializada</p>
              <h2 class="mt-2 text-3xl font-black">Servicios destacados</h2>
            </div>
            <UButton to="/servicios" label="Ver todos" variant="ghost" trailing icon="i-lucide-arrow-right" />
          </div>
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <PublicServiceCard v-for="service in home.services" :key="service.slug" :service="service" /></div
        ></UContainer>
      </section>

      <section class="border-y border-default bg-gradient-to-r from-ajk-50 to-muted py-16">
        <UContainer class="grid gap-6 md:grid-cols-2">
          <UCard class="bg-default ring-default">
            <UIcon name="i-lucide-wrench" class="size-8 text-primary" />
            <h2 class="mt-5 text-2xl font-black">Servicios tecnológicos</h2>
            <p class="mt-3 leading-7 text-muted">
              Solicita soporte, mantenimiento y soluciones para tus equipos. Cuéntanos qué necesitas.
            </p>
            <UButton to="/servicios" label="Ver servicios" class="mt-6" variant="soft" />
          </UCard>
          <UCard class="bg-default ring-default">
            <UIcon name="i-lucide-key-round" class="size-8 text-primary" />
            <h2 class="mt-5 text-2xl font-black">Software y productos digitales</h2>
            <p class="mt-3 leading-7 text-muted">
              Encuentra licencias y soluciones digitales y coordina tu compra directamente por WhatsApp.
            </p>
            <UButton
              to="/productos"
              label="Ver productos digitales"
              class="mt-6"
              color="secondary"
              variant="soft"
            />
          </UCard>
        </UContainer>
      </section>

      <section v-if="home.brands.length" class="py-14" aria-labelledby="brands-title">
        <UContainer>
          <h2 id="brands-title" class="text-center text-xl font-bold">Marcas disponibles</h2>
          <div class="mt-8 flex flex-wrap justify-center gap-3">
            <NuxtLink
              v-for="brand in home.brands"
              :key="brand.slug"
              :to="{ path: '/productos', query: { brand: brand.slug } }"
              class="rounded-xl border border-default bg-default px-5 py-3 font-semibold text-default hover:border-primary hover:text-highlighted"
            >
              {{ brand.name }}
            </NuxtLink>
          </div>
        </UContainer>
      </section>
    </template>
  </div>
</template>
