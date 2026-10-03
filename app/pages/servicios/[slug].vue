<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type { PublicServiceDetail } from '#shared/types/services'

const route = useRoute()
const config = useRuntimeConfig()
const slug = String(route.params.slug)
const { data, error } = await useAsyncData(`service-${slug}`, () =>
  $fetch<ApiSuccess<PublicServiceDetail>>(`/api/services/${slug}`)
)
if (error.value || !data.value)
  throw createError({ statusCode: 404, statusMessage: 'Servicio no encontrado' })
const service = computed(() => data.value!.data)
const canonical = `${config.public.appUrl}/servicios/${slug}`
useSeoMeta({
  title: () => service.value.metaTitle || service.value.name,
  description: () =>
    service.value.metaDescription || service.value.shortDescription || 'Servicio tecnológico profesional.',
  ogTitle: () => service.value.metaTitle || service.value.name,
  ogDescription: () => service.value.metaDescription || service.value.shortDescription || '',
  ogUrl: canonical,
  ogImage: () => service.value.image || undefined
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        ['@context']: 'https://schema.org',
        ['@type']: 'Service',
        name: service.value.name,
        description: service.value.shortDescription,
        provider: { ['@type']: 'Organization', name: 'AjkSolutionS' },
        areaServed: 'EC',
        ...(service.value.price.amount
          ? {
              offers: {
                ['@type']: 'Offer',
                price: service.value.price.amount,
                priceCurrency: service.value.price.currency
              }
            }
          : {})
      })
    }
  ]
}))
</script>

<template>
  <UContainer class="py-8 lg:py-12">
    <PublicBreadcrumbs
      :items="[
        { name: 'Servicios', path: '/servicios' },
        { name: service.name, path: canonical }
      ]"
    />
    <div class="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <article class="min-w-0">
        <UBadge :label="service.category.name" variant="soft" />
        <h1
          class="mt-4 break-words text-3xl font-bold tracking-tight text-highlighted sm:text-4xl lg:text-5xl"
        >
          {{ service.name }}
        </h1>
        <p class="mt-5 text-xl leading-8 text-default">{{ service.shortDescription }}</p>
        <NuxtImg
          v-if="service.image"
          :src="service.image"
          :alt="service.name"
          width="1000"
          height="560"
          class="mt-8 aspect-video w-full rounded-2xl object-cover"
        />
        <PublicDescription
          v-if="service.description"
          :text="service.description"
          title="Descripción"
          heading-id="service-description"
          class="mt-8"
        />
        <div class="mt-8 grid gap-4 sm:grid-cols-2">
          <UCard class="bg-default ring-default"
            ><p class="text-sm text-muted">Modalidades</p>
            <p class="mt-2 font-bold">{{ service.modalities.join(' · ') || 'A coordinar' }}</p></UCard
          ><UCard class="bg-default ring-default"
            ><p class="text-sm text-muted">Duración estimada</p>
            <p class="mt-2 font-bold">{{ service.estimatedDuration || 'A confirmar' }}</p></UCard
          ><UCard v-if="service.warranty" class="bg-default ring-default"
            ><p class="text-sm text-muted">Garantía</p>
            <p class="mt-2 font-bold">{{ service.warranty }}</p></UCard
          ><UCard class="bg-default ring-default"
            ><p class="text-sm text-muted">Precio</p>
            <PublicServicePrice class="mt-2" :price="service.price"
          /></UCard>
        </div>
      </article>
      <aside class="min-w-0"><PublicDynamicServiceForm :service="service" /></aside>
    </div>
  </UContainer>
</template>
