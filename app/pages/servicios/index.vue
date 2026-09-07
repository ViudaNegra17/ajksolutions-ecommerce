<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type { PublicServiceCard } from '#shared/types/services'

type Category = { name: string; slug: string; description: string | null; icon: string | null }
type ServicesData = { items: PublicServiceCard[]; categories: Category[] }
const route = useRoute()
const search = ref(String(route.query.search || ''))
const category = ref(String(route.query.category || ''))
const query = computed(() => ({ search: search.value || undefined, category: category.value || undefined }))
const { data, status, error, refresh } = await useAsyncData(
  'public-services',
  () => $fetch<ApiSuccess<ServicesData>>('/api/services', { query: query.value }),
  { watch: [query] }
)
const result = computed(() => data.value?.data)
const config = useRuntimeConfig()
const canonical = `${config.public.appUrl}/servicios`
useSeoMeta({
  title: 'Servicios tecnológicos',
  description: 'Solicita soporte y servicios tecnológicos con seguimiento mediante ticket.',
  ogTitle: 'Servicios tecnológicos | AjkSolutionS',
  ogDescription: 'Atención profesional con solicitud y seguimiento por ticket.',
  ogUrl: canonical
})
useHead({ link: [{ rel: 'canonical', href: canonical }] })
</script>

<template>
  <div>
    <section class="border-b border-white/10 bg-gradient-to-br from-cyan-950/30 to-slate-950 py-16">
      <UContainer
        ><p class="text-sm font-bold uppercase tracking-widest text-cyan-400">Soluciones profesionales</p>
        <h1 class="mt-3 text-4xl font-black sm:text-5xl">Servicios tecnológicos</h1>
        <p class="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
          Cuéntanos lo que necesitas. Registramos tu solicitud y te damos un número de ticket antes de
          continuar por WhatsApp.
        </p></UContainer
      >
    </section>
    <UContainer class="py-12">
      <div class="mb-8 grid gap-3 sm:grid-cols-[1fr_260px]">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar servicio" size="lg" /><select
          v-model="category"
          class="rounded-md border border-white/15 bg-slate-900 px-3"
        >
          <option value="">Todas las categorías</option>
          <option v-for="item in result?.categories" :key="item.slug" :value="item.slug">
            {{ item.name }}
          </option>
        </select>
      </div>
      <div v-if="status === 'pending'" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <USkeleton v-for="i in 6" :key="i" class="h-112 rounded-2xl" />
      </div>
      <UAlert
        v-else-if="error"
        color="error"
        title="No pudimos cargar los servicios"
        :actions="[{ label: 'Reintentar', onClick: () => refresh() }]"
      />
      <div v-else-if="result?.items.length" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <PublicServiceCard v-for="service in result.items" :key="service.slug" :service="service" />
      </div>
      <UEmpty
        v-else
        icon="i-lucide-wrench"
        title="No hay servicios disponibles"
        description="Prueba con otra búsqueda o vuelve pronto."
      />
    </UContainer>
  </div>
</template>
