<script setup lang="ts">
import type { PublicImage } from '#shared/types/public-catalog'

const props = defineProps<{ images: PublicImage[]; productName: string }>()
const active = ref(0)
watch(
  () => props.images,
  () => (active.value = 0)
)
</script>

<template>
  <div>
    <div class="aspect-square overflow-hidden rounded-2xl border border-default bg-default">
      <NuxtImg
        v-if="images[active]"
        :src="images[active]!.url"
        :alt="images[active]!.alt"
        width="900"
        height="900"
        format="webp"
        sizes="100vw sm:50vw lg:600px"
        class="h-full w-full object-contain"
      />
      <div v-else class="grid h-full place-items-center">
        <div class="text-center text-muted">
          <UIcon name="i-lucide-image-off" class="mx-auto size-16" />
          <p class="mt-3">Imagen no disponible</p>
        </div>
      </div>
    </div>
    <div v-if="images.length > 1" class="mt-3 flex gap-3 overflow-x-auto pb-2" aria-label="Galería">
      <button
        v-for="(image, index) in images"
        :key="image.url"
        type="button"
        :aria-label="`Ver imagen ${index + 1} de ${productName}`"
        :aria-pressed="active === index"
        :class="[
          'size-20 shrink-0 overflow-hidden rounded-xl border bg-default',
          active === index ? 'border-primary ring-2 ring-primary' : 'border-default'
        ]"
        @click="active = index"
      >
        <NuxtImg
          :src="image.url"
          :alt="image.alt"
          width="160"
          height="160"
          class="h-full w-full object-cover"
        />
      </button>
    </div>
  </div>
</template>
