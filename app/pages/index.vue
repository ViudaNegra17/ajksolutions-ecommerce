<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type { PublicBanner, PublicSettings } from '#shared/types/public-catalog'
import type { PublicServiceCard } from '#shared/types/services'

type HomeData = { settings: PublicSettings; services: PublicServiceCard[]; banners: PublicBanner[] }
const config = useRuntimeConfig()
const { data, status, error, refresh } = await useAsyncData('public-home', () =>
  $fetch<ApiSuccess<HomeData>>('/api/home')
)
const home = computed(() => data.value?.data)
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
      <PublicHomeSolutions />
      <PublicHomeCampaigns :banners="home.banners" />
      <PublicHomeServices :services="home.services" />
      <PublicHomeDigital />
      <PublicHomeBacking />
      <PublicHomeHowItWorks />
      <PublicHomeContact :whatsapp="home.settings.business.whatsapp" />
    </template>
  </div>
</template>
