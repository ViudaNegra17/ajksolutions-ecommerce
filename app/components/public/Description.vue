<script setup lang="ts">
defineProps<{ text: string; title?: string; headingId?: string }>()
</script>

<template>
  <section class="min-w-0 max-w-prose" :aria-labelledby="title ? headingId : undefined">
    <h2 v-if="title" :id="headingId" class="text-2xl font-bold tracking-tight text-highlighted">
      {{ title }}
    </h2>
    <p class="whitespace-pre-line break-words text-base leading-8 text-default" :class="title ? 'mt-5' : ''">
      {{ text }}
    </p>
  </section>
</template>
