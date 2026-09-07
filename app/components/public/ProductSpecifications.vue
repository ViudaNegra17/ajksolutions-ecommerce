<script setup lang="ts">
import type { PublicSpecification } from '#shared/types/public-catalog'

defineProps<{ specifications: PublicSpecification[] }>()
</script>

<template>
  <section v-if="specifications.length" aria-labelledby="specifications-title">
    <h2 id="specifications-title" class="text-2xl font-black text-white">Especificaciones</h2>
    <dl class="mt-5 overflow-hidden rounded-2xl border border-white/10">
      <div
        v-for="(item, index) in specifications"
        :key="item.name"
        :class="[
          'grid gap-1 px-5 py-4 sm:grid-cols-[minmax(12rem,1fr)_2fr]',
          index % 2 ? 'bg-white/[.03]' : ''
        ]"
      >
        <dt class="font-medium text-slate-400">{{ item.name }}</dt>
        <dd class="text-slate-100">{{ item.value }}{{ item.unit ? ` ${item.unit}` : '' }}</dd>
      </div>
    </dl>
  </section>
</template>
