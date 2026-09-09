<script setup lang="ts">
import { es } from '@nuxt/ui/locale'

useColorMode().preference = 'light'
useSeoMeta({
  titleTemplate: (title) => (title ? `${title} · AjkSolutionS` : 'AjkSolutionS e-Commerce'),
  description: 'Productos tecnológicos, licencias digitales y servicios profesionales.'
})
</script>

<template>
  <UApp :locale="es">
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout><NuxtPage /></NuxtLayout>
  </UApp>
</template>
