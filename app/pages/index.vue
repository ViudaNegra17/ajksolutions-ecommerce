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
    <PublicHomeHero />
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
      <PublicHomeCampaigns :banners="home.banners" />
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
