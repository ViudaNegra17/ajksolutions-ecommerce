<script setup lang="ts">
useSeoMeta({
  titleTemplate: (title) => (title ? `${title} · AjkSolutionS` : 'AjkSolutionS e-Commerce'),
  description: 'Productos tecnológicos, licencias digitales y servicios profesionales.'
})
</script>

<template>
  <UApp>
    <NuxtLayout><NuxtPage /></NuxtLayout>
  </UApp>
</template>
