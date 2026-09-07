<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type { PublicSettings } from '#shared/types/public-catalog'

const { data } = await useAsyncData('public-settings', () =>
  $fetch<ApiSuccess<PublicSettings>>('/api/settings/public')
)
const settings = computed(() => data.value?.data)
</script>

<template>
  <footer class="border-t border-white/10 bg-slate-950 py-12 text-sm text-slate-400">
    <UContainer class="grid gap-10 md:grid-cols-4">
      <div class="md:col-span-2">
        <p class="text-lg font-black text-white">{{ settings?.business.name || 'AjkSolutionS' }}</p>
        <p class="mt-3 max-w-md leading-6">
          Tecnología, licencias y servicios profesionales en una experiencia comercial clara y segura.
        </p>
      </div>
      <div>
        <p class="font-semibold text-white">Explorar</p>
        <nav class="mt-3 grid gap-2" aria-label="Enlaces del pie">
          <NuxtLink to="/productos" class="hover:text-cyan-300">Productos</NuxtLink>
          <NuxtLink to="/servicios" class="hover:text-cyan-300">Servicios</NuxtLink>
        </nav>
      </div>
      <div>
        <p class="font-semibold text-white">Contacto</p>
        <div class="mt-3 grid gap-2">
          <a v-if="settings?.business.email" :href="`mailto:${settings.business.email}`">
            {{ settings.business.email }}
          </a>
          <a v-if="settings?.business.phone" :href="`tel:${settings.business.phone}`">
            {{ settings.business.phone }}
          </a>
          <span v-if="settings?.business.address">
            {{ settings.business.address
            }}<template v-if="settings.business.city">, {{ settings.business.city }}</template>
          </span>
          <span v-if="!settings?.business.email && !settings?.business.phone">
            Canales de contacto próximamente.
          </span>
        </div>
        <div class="mt-4 flex gap-3">
          <a
            v-if="settings?.social.facebook"
            :href="settings.social.facebook"
            target="_blank"
            rel="noopener noreferrer"
            >Facebook</a
          >
          <a
            v-if="settings?.social.instagram"
            :href="settings.social.instagram"
            target="_blank"
            rel="noopener noreferrer"
            >Instagram</a
          >
        </div>
      </div>
    </UContainer>
    <UContainer class="mt-10 border-t border-white/10 pt-6">
      © {{ new Date().getFullYear() }} {{ settings?.business.name || 'AjkSolutionS' }}
    </UContainer>
  </footer>
</template>
