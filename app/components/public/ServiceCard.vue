<script setup lang="ts">
import type { PublicServiceCard } from '#shared/types/services'

defineProps<{ service: PublicServiceCard }>()
</script>

<template>
  <UCard class="flex h-full flex-col overflow-hidden bg-slate-900/70 ring-white/10">
    <NuxtImg
      v-if="service.image"
      :src="service.image"
      :alt="service.name"
      width="640"
      height="360"
      loading="lazy"
      class="mb-5 aspect-video w-full rounded-xl object-cover"
    />
    <div v-else class="mb-5 grid aspect-video place-items-center rounded-xl bg-cyan-500/10">
      <UIcon name="i-lucide-wrench" class="size-12 text-cyan-300" />
    </div>
    <UBadge :label="service.category.name" variant="soft" class="self-start" />
    <h2 class="mt-3 text-xl font-black">{{ service.name }}</h2>
    <p class="mt-2 grow leading-6 text-slate-400">
      {{ service.shortDescription || 'Asesoría y atención especializada.' }}
    </p>
    <div v-if="service.modalities.length" class="mt-4 flex flex-wrap gap-2">
      <UBadge
        v-for="mode in service.modalities"
        :key="mode"
        :label="mode"
        color="neutral"
        variant="outline"
      />
    </div>
    <div class="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-5">
      <PublicServicePrice :price="service.price" />
      <UButton :to="`/servicios/${service.slug}`" label="Ver servicio" trailing icon="i-lucide-arrow-right" />
    </div>
  </UCard>
</template>
