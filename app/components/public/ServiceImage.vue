<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string | null
    alt: string
    width?: number
    height?: number
    sizes?: string
    loading?: 'lazy' | 'eager'
  }>(),
  { width: 640, height: 360, loading: 'lazy' }
)
const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  }
)
</script>

<template>
  <div data-service-image class="grid aspect-video w-full place-items-center overflow-hidden bg-primary/10">
    <NuxtImg
      v-if="src && !failed"
      :key="src"
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      :sizes="sizes"
      :loading="loading"
      class="size-full object-cover"
      @error="failed = true"
    />
    <div
      v-else
      data-service-image-fallback
      role="img"
      :aria-label="`Imagen no disponible para ${alt}`"
      class="grid size-full place-items-center"
    >
      <UIcon name="i-lucide-wrench" class="size-12 text-primary" aria-hidden="true" />
    </div>
  </div>
</template>
