<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type { PublicBanner, PublicSettings } from '#shared/types/public-catalog'
import type { PublicServiceCard } from '#shared/types/services'
import { buildWhatsAppUrl } from '#shared/utils/tickets'

type HomeData = { settings: PublicSettings; services: PublicServiceCard[]; banners: PublicBanner[] }
const config = useRuntimeConfig()
const { data, status, error, refresh } = await useAsyncData('public-home', () =>
  $fetch<ApiSuccess<HomeData>>('/api/home')
)
const home = computed(() => data.value?.data)
const hero = computed(() => home.value?.banners.find((banner) => banner.placement === 'HOME_HERO'))
const heroDescription = computed(
  () =>
    hero.value?.description ||
    'Equipos, licencias digitales y soporte técnico. Encuentra tu solución y coordina los siguientes pasos con AJKSolutionS.'
)
const campaigns = computed(
  () => home.value?.banners.filter((banner) => banner.placement === 'HOME_SECONDARY') || []
)
const contactUrl = computed(() => {
  const phone = home.value?.settings.business.whatsapp
  return phone?.replace(/\D/g, '')
    ? buildWhatsAppUrl(phone, 'Hola, necesito asesoría sobre productos, licencias digitales o servicios.')
    : '/servicios'
})
const solutions = [
  {
    title: 'Productos',
    text: 'Equipos, componentes y accesorios para trabajar, estudiar y crear.',
    cta: 'Ver productos',
    to: '/productos',
    number: '01'
  },
  {
    title: 'Licencias digitales',
    text: 'Software y soluciones digitales. Coordinamos contigo el pago y la entrega por WhatsApp.',
    cta: 'Ver licencias digitales',
    to: '/productos?productType=DIGITAL',
    number: '02'
  },
  {
    title: 'Servicios tecnológicos',
    text: 'Soporte, reparación y soluciones especializadas para tus equipos.',
    cta: 'Ver servicios',
    to: '/servicios',
    number: '03'
  }
]
const support = [
  { title: 'Asesoría especializada', text: 'Consulta qué solución se ajusta a lo que necesitas.' },
  { title: 'Garantía informada', text: 'Revisa la garantía indicada para cada producto o servicio.' },
  { title: 'Soporte técnico', text: 'Solicita diagnóstico, mantenimiento o reparación de tus equipos.' },
  { title: 'Atención directa', text: 'Continuamos contigo por WhatsApp para coordinar tu solicitud.' }
]
const canonical = `${config.public.appUrl}/`
useSeoMeta({
  title: () => home.value?.settings.seo.title || 'Productos, licencias digitales y servicios tecnológicos',
  description: () =>
    home.value?.settings.seo.description ||
    'Encuentra tecnología para tus proyectos y solicita soporte con atención directa de AJKSolutionS.',
  ogTitle: () => home.value?.settings.seo.title || 'AJKSolutionS',
  ogDescription: () =>
    home.value?.settings.seo.description || 'Productos, licencias digitales y servicios tecnológicos.',
  ogUrl: canonical,
  twitterTitle: () => home.value?.settings.seo.title || 'AJKSolutionS',
  twitterDescription: () =>
    home.value?.settings.seo.description || 'Productos, licencias digitales y servicios tecnológicos.'
})
useHead({ link: [{ rel: 'canonical', href: canonical }] })
</script>

<template>
  <div>
    <section class="border-b border-default bg-ajk-50" aria-labelledby="home-hero">
      <UContainer class="grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
        <div class="min-w-0">
          <p class="text-sm font-semibold uppercase tracking-widest text-primary">
            {{ hero?.subtitle || 'Tecnología con atención directa' }}
          </p>
          <h1
            id="home-hero"
            class="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-highlighted sm:text-4xl lg:text-5xl"
          >
            {{ hero?.title || 'Tecnología para trabajar, crear y conectar.' }}
          </h1>
          <p class="mt-6 max-w-xl text-base leading-8 text-default sm:text-lg">
            {{ heroDescription }}
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <UButton
              :to="hero?.ctaUrl || '/productos'"
              :label="hero?.ctaLabel || 'Ver productos'"
              size="lg"
              trailing
              icon="i-lucide-arrow-right"
            />
            <UButton to="/servicios" label="Solicitar servicio" color="neutral" variant="outline" size="lg" />
          </div>
        </div>
        <picture v-if="hero" class="block min-w-0 overflow-hidden rounded-3xl bg-white">
          <source v-if="hero.mobileImageUrl" :srcset="hero.mobileImageUrl" media="(max-width: 639px)" />
          <img
            :src="hero.imageUrl"
            :alt="hero.title"
            width="720"
            height="600"
            fetchpriority="high"
            class="aspect-[6/5] w-full object-contain"
          />
        </picture>
        <div v-else class="rounded-3xl border border-default bg-white p-8 sm:p-12">
          <AppLogo class="w-full max-w-72" />
          <p class="mt-8 text-2xl font-semibold text-highlighted">Una solución para cada proyecto.</p>
          <p class="mt-3 leading-7 text-muted">Productos · Licencias digitales · Servicios tecnológicos</p>
        </div>
      </UContainer>
    </section>
    <UContainer v-if="status === 'pending'" class="grid gap-6 py-16 md:grid-cols-3"
      ><USkeleton v-for="n in 3" :key="n" class="h-64 rounded-3xl"
    /></UContainer>
    <UContainer v-else-if="error" class="py-16"
      ><UAlert
        title="No pudimos cargar la información"
        color="error"
        :actions="[{ label: 'Reintentar', onClick: () => refresh() }]"
    /></UContainer>
    <template v-else-if="home">
      <section class="py-16 lg:py-20" aria-labelledby="home-solutions">
        <UContainer>
          <p class="text-sm font-semibold uppercase tracking-widest text-primary">Elige tu camino</p>
          <h2 id="home-solutions" class="mt-3 text-3xl font-bold tracking-tight text-highlighted">
            Soluciones AJKSolutionS
          </h2>
          <div class="mt-8 grid gap-6 lg:grid-cols-3">
            <article
              v-for="solution in solutions"
              :key="solution.title"
              class="flex min-w-0 flex-col rounded-3xl border border-default bg-muted p-7 sm:p-8"
            >
              <span class="text-sm font-semibold text-primary" aria-hidden="true">{{ solution.number }}</span>
              <h3 class="mt-6 text-2xl font-bold text-highlighted">{{ solution.title }}</h3>
              <p class="mt-4 flex-1 leading-7 text-muted">{{ solution.text }}</p>
              <UButton
                :to="solution.to"
                :label="solution.cta"
                variant="link"
                trailing
                icon="i-lucide-arrow-right"
                class="mt-7 self-start px-0"
              />
            </article>
          </div>
        </UContainer>
      </section>
      <section v-if="campaigns.length" class="pb-16 lg:pb-20" aria-label="Campañas comerciales">
        <UContainer class="grid gap-6">
          <article
            v-for="banner in campaigns"
            :key="banner.title"
            class="grid items-center overflow-hidden rounded-3xl border border-default bg-ajk-50 md:grid-cols-2"
          >
            <div class="min-w-0 p-7 sm:p-10">
              <p v-if="banner.subtitle" class="text-sm font-semibold text-primary">{{ banner.subtitle }}</p>
              <h2 class="mt-3 text-3xl font-bold tracking-tight text-highlighted">{{ banner.title }}</h2>
              <p v-if="banner.description" class="mt-4 max-w-xl leading-7">{{ banner.description }}</p>
              <UButton
                v-if="banner.ctaUrl"
                :to="banner.ctaUrl"
                :label="banner.ctaLabel || 'Ver productos'"
                class="mt-6"
              />
            </div>
            <img
              :src="banner.imageUrl"
              :alt="banner.title"
              loading="lazy"
              width="720"
              height="480"
              class="aspect-[3/2] w-full object-contain"
            />
          </article>
        </UContainer>
      </section>
      <section class="border-y border-default bg-muted py-16 lg:py-20" aria-labelledby="home-services">
        <UContainer>
          <div class="max-w-2xl">
            <p class="text-sm font-semibold uppercase tracking-widest text-primary">
              Soporte para seguir adelante
            </p>
            <h2 id="home-services" class="mt-3 text-3xl font-bold tracking-tight text-highlighted">
              ¿Tu equipo necesita atención?
            </h2>
            <p class="mt-5 leading-8 text-muted">
              Encuentra un servicio, describe lo que ocurre y solicita atención. Coordinamos contigo el
              diagnóstico y los siguientes pasos.
            </p>
          </div>
          <div v-if="home.services.length" class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="service in home.services"
              :key="service.slug"
              class="flex min-w-0 flex-col rounded-3xl border border-default bg-default p-7"
            >
              <h3 class="text-xl font-bold text-highlighted">{{ service.name }}</h3>
              <p v-if="service.shortDescription" class="mt-4 flex-1 leading-7 text-muted">
                {{ service.shortDescription }}
              </p>
              <PublicServicePrice :price="service.price" class="mt-5" />
              <UButton
                :to="`/servicios/${service.slug}`"
                label="Solicitar servicio"
                class="mt-6 self-start"
                variant="soft"
              />
            </article>
          </div>
          <UButton to="/servicios" label="Ver servicios" variant="outline" color="neutral" class="mt-8" />
        </UContainer>
      </section>
      <section class="py-16 lg:py-20" aria-labelledby="home-digital">
        <UContainer class="grid items-start gap-8 md:grid-cols-2">
          <div>
            <p class="text-sm font-semibold uppercase tracking-widest text-primary">
              Software para tus proyectos
            </p>
            <h2 id="home-digital" class="mt-3 text-3xl font-bold tracking-tight text-highlighted">
              Licencias digitales
            </h2>
          </div>
          <div>
            <p class="max-w-xl leading-8 text-muted">
              Consulta las soluciones disponibles, realiza tu compra individual y coordina el pago y la
              entrega con nuestro equipo por WhatsApp.
            </p>
            <UButton
              to="/productos?productType=DIGITAL"
              label="Ver licencias digitales"
              class="mt-6"
              trailing
              icon="i-lucide-arrow-right"
            />
          </div>
        </UContainer>
      </section>
      <section class="border-y border-default py-16 lg:py-20" aria-labelledby="home-support">
        <UContainer
          ><h2 id="home-support" class="text-3xl font-bold tracking-tight text-highlighted">
            Respaldo AJKSolutionS
          </h2>
          <div class="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div v-for="item in support" :key="item.title">
              <h3 class="text-lg font-semibold text-highlighted">{{ item.title }}</h3>
              <p class="mt-3 leading-7 text-muted">{{ item.text }}</p>
            </div>
          </div></UContainer
        >
      </section>
      <section class="py-16 lg:py-20" aria-labelledby="home-how">
        <UContainer
          ><h2 id="home-how" class="text-3xl font-bold tracking-tight text-highlighted">
            Cómo comprar o solicitar
          </h2>
          <ol class="mt-8 grid gap-7 md:grid-cols-3">
            <li
              v-for="(step, index) in [
                'Encuentra tu producto o servicio',
                'Realiza tu pedido o solicitud',
                'Continuamos contigo por WhatsApp'
              ]"
              :key="step"
              class="border-t-2 border-primary pt-5"
            >
              <span class="text-sm font-bold text-primary">{{ index + 1 }}</span>
              <p class="mt-3 text-lg font-semibold text-highlighted">{{ step }}</p>
            </li>
          </ol></UContainer
        >
      </section>
      <section class="bg-ajk-50 py-16 lg:py-20" aria-labelledby="home-contact">
        <UContainer
          ><h2 id="home-contact" class="max-w-2xl text-3xl font-bold tracking-tight text-highlighted">
            ¿Necesitas ayuda para elegir?
          </h2>
          <p class="mt-5 max-w-xl leading-8 text-muted">
            Nuestro equipo puede orientarte en productos, licencias digitales y servicios.
          </p>
          <UButton
            :to="contactUrl"
            :target="contactUrl.startsWith('https://') ? '_blank' : undefined"
            rel="noopener noreferrer"
            :label="contactUrl.startsWith('https://') ? 'Hablar con AJKSolutionS' : 'Consultar servicios'"
            size="lg"
            icon="i-lucide-message-circle"
            class="mt-7"
        /></UContainer>
      </section>
    </template>
  </div>
</template>
