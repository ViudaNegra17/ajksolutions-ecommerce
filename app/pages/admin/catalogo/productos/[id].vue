<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Editar producto', robots: 'noindex, nofollow' })
const route = useRoute()
</script>

<template>
  <AdminProductAdminForm :product-id="String(route.params.id)" />
</template>
