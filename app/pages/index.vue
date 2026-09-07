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
    'Explora un catálogo tecnológico con precios transparentes, disponibilidad real y asesoría cuando la solución requiere una cotización.'
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
    <section class="relative overflow-hidden border-b border-white/10">
      <picture v-if="hero" class="absolute inset-0">
        <source v-if="hero.mobileImageUrl" :srcset="hero.mobileImageUrl" media="(max-width: 639px)" />
        <img :src="hero.imageUrl" :alt="hero.title" class="h-full w-full object-cover opacity-25" />
      </picture>
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.22),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(79,70,229,.18),transparent_40%)]"
      />
      <UContainer class="relative grid gap-12 py-20 lg:grid-cols-[1.15fr_.85fr] lg:py-28">
        <div>
          <UBadge :label="hero?.subtitle || 'Tecnología para personas y empresas'" variant="soft" />
          <h1 class="mt-6 max-w-4xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            <template v-if="hero">{{ hero.title }}</template>
            <template v-else
              >Soluciones que convierten ideas en <span class="text-cyan-300">resultados.</span></template
            >
          </h1>
          <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            {{ heroDescription }}
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <UButton
              :to="hero?.ctaUrl || '/productos'"
              :label="hero?.ctaLabel || 'Explorar catálogo'"
              size="xl"
              icon="i-lucide-arrow-right"
              trailing
            />
            <UButton to="/servicios" label="Conocer servicios" size="xl" color="neutral" variant="outline" />
          </div>
        </div>
        <div class="grid content-end gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <div
            v-for="benefit in [
              [
                'i-lucide-package-check',
                'Disponibilidad clara',
                'Stock propio y disponibilidad bajo pedido.'
              ],
              [
                'i-lucide-badge-dollar-sign',
                'Precio confiable',
                'Impuestos calculados desde la configuración real.'
              ],
              ['i-lucide-monitor-smartphone', 'Experiencia ágil', 'Catálogo adaptable a cualquier pantalla.']
            ]"
            :key="benefit[1]"
            class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
          >
            <UIcon :name="benefit[0]" class="size-6 text-cyan-300" />
            <p class="mt-3 font-bold">{{ benefit[1] }}</p>
            <p class="mt-1 text-sm leading-6 text-slate-400">{{ benefit[2] }}</p>
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
            class="relative min-h-64 overflow-hidden rounded-3xl border border-white/10 p-7"
          >
            <img
              :src="banner.imageUrl"
              :alt="banner.title"
              class="absolute inset-0 h-full w-full object-cover opacity-25"
            />
            <div class="relative">
              <p v-if="banner.subtitle" class="text-sm font-bold uppercase text-cyan-300">
                {{ banner.subtitle }}
              </p>
              <h2 class="mt-2 text-3xl font-black">{{ banner.title }}</h2>
              <p v-if="banner.description" class="mt-3 max-w-xl text-slate-300">{{ banner.description }}</p>
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
              <p class="text-sm font-bold uppercase tracking-widest text-cyan-400">Explora</p>
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

      <section class="border-y border-white/10 bg-slate-900/35 py-16" aria-labelledby="featured-products">
        <UContainer>
          <p class="text-sm font-bold uppercase tracking-widest text-cyan-400">Selección especial</p>
          <h2 id="featured-products" class="mb-8 mt-2 text-3xl font-black">Productos destacados</h2>
          <PublicProductGrid :products="home.featured" />
        </UContainer>
      </section>

      <section class="py-16" aria-labelledby="new-products">
        <UContainer>
          <p class="text-sm font-bold uppercase tracking-widest text-cyan-400">Recién publicados</p>
          <h2 id="new-products" class="mb-8 mt-2 text-3xl font-black">Nuevos productos</h2>
          <PublicProductGrid :products="home.newest" />
        </UContainer>
      </section>

      <section
        v-if="home.services.length"
        class="border-y border-white/10 bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 py-16"
      >
        <UContainer
          ><div class="mb-8 flex items-end justify-between">
            <div>
              <p class="text-sm font-bold uppercase tracking-widest text-cyan-400">Atención especializada</p>
              <h2 class="mt-2 text-3xl font-black">Servicios destacados</h2>
            </div>
            <UButton to="/servicios" label="Ver todos" variant="ghost" trailing icon="i-lucide-arrow-right" />
          </div>
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <PublicServiceCard v-for="service in home.services" :key="service.slug" :service="service" /></div
        ></UContainer>
      </section>

      <section class="border-y border-white/10 bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 py-16">
        <UContainer class="grid gap-6 md:grid-cols-2">
          <UCard class="bg-slate-950/60 ring-white/10">
            <UIcon name="i-lucide-wrench" class="size-8 text-cyan-300" />
            <h2 class="mt-5 text-2xl font-black">Servicios tecnológicos</h2>
            <p class="mt-3 leading-7 text-slate-400">
              Conoce el espacio preparado para soporte y soluciones profesionales.
            </p>
            <UButton to="/servicios" label="Ver servicios" class="mt-6" variant="soft" />
          </UCard>
          <UCard class="bg-slate-950/60 ring-white/10">
            <UIcon name="i-lucide-key-round" class="size-8 text-indigo-300" />
            <h2 class="mt-5 text-2xl font-black">Licencias digitales</h2>
            <p class="mt-3 leading-7 text-slate-400">
              Consulta el espacio de software original, sin iniciar todavía un flujo de compra.
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
              class="rounded-xl border border-white/10 bg-slate-900 px-5 py-3 font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-white"
            >
              {{ brand.name }}
            </NuxtLink>
          </div>
        </UContainer>
      </section>
    </template>
  </div>
</template>
