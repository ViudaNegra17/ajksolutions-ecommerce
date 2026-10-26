<script setup lang="ts">
import { computed } from 'vue'
import type { PublicBanner } from '#shared/types/public-catalog'

const props = defineProps<{ banners: PublicBanner[] }>()
const campaigns = computed(() => {
  const hero = props.banners.find((banner) => banner.placement === 'HOME_HERO')
  const secondary = props.banners.filter((banner) => banner.placement === 'HOME_SECONDARY')
  return hero ? [hero, ...secondary] : secondary
})
</script>

<template>
  <section v-if="campaigns.length" class="pb-16 lg:pb-20" aria-label="Campañas comerciales">
    <UContainer class="grid gap-6">
      <article
        v-for="banner in campaigns"
        :key="`${banner.placement}:${banner.title}`"
        class="grid items-center overflow-hidden rounded-3xl border border-default bg-ajk-50"
        :class="{ 'md:grid-cols-2': banner.imageUrl }"
      >
        <div class="min-w-0 p-7 sm:p-10">
          <p v-if="banner.subtitle" class="text-sm font-semibold text-primary">{{ banner.subtitle }}</p>
          <h2 class="mt-3 text-3xl font-bold tracking-tight text-highlighted">{{ banner.title }}</h2>
          <p v-if="banner.description" class="mt-4 max-w-xl leading-7">{{ banner.description }}</p>
          <UButton
            v-if="banner.ctaUrl"
            :to="banner.ctaUrl"
            :label="banner.ctaLabel || 'Ver productos'"
            class="mt-6"
          />
        </div>
        <picture v-if="banner.imageUrl" class="block min-w-0">
          <source v-if="banner.mobileImageUrl" :srcset="banner.mobileImageUrl" media="(max-width: 767px)" />
          <img
            :src="banner.imageUrl"
            :alt="banner.title"
            loading="lazy"
            width="720"
            :height="banner.placement === 'HOME_HERO' ? 600 : 480"
            class="w-full object-contain"
            :class="banner.placement === 'HOME_HERO' ? 'aspect-[6/5]' : 'aspect-[3/2]'"
          />
        </picture>
      </article>
    </UContainer>
  </section>
</template>
