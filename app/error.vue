<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()
</script>

<template>
  <UApp>
    <main
      class="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <AppLogo class="w-40" />
      <p class="text-sm font-semibold text-primary">
        {{ error.statusCode === 404 ? 'Página no encontrada' : 'No pudimos abrir esta página' }}
      </p>
      <h1 class="text-3xl font-bold">Vamos a ayudarte a continuar</h1>
      <p class="text-muted">
        {{
          error.statusCode === 404
            ? 'El enlace puede haber cambiado o el contenido ya no está disponible.'
            : 'Intenta nuevamente en unos momentos o explora nuestras otras secciones.'
        }}
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <UButton label="Inicio" @click="clearError({ redirect: '/' })" />
        <UButton
          label="Productos"
          color="neutral"
          variant="outline"
          @click="clearError({ redirect: '/productos' })"
        />
        <UButton
          label="Servicios"
          color="neutral"
          variant="outline"
          @click="clearError({ redirect: '/servicios' })"
        />
      </div>
    </main>
  </UApp>
</template>
