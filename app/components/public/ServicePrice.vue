<script setup lang="ts">
import type { PublicServiceCard } from '#shared/types/services'

const props = defineProps<{ price: PublicServiceCard['price'] }>()
const formatted = computed(() =>
  props.price.amount == null
    ? null
    : new Intl.NumberFormat('es-EC', { style: 'currency', currency: props.price.currency }).format(
        Number(props.price.amount)
      )
)
</script>

<template>
  <div>
    <p v-if="price.mode === 'QUOTE'" class="text-lg font-bold text-cyan-300">Solicitar cotización</p>
    <p v-else class="text-lg font-black text-white">
      <span v-if="price.mode === 'FROM'" class="mr-1 text-sm font-medium text-slate-400">Desde</span
      >{{ formatted }}
    </p>
    <p v-if="price.amount" class="text-xs text-slate-500">Precio final calculado con impuestos.</p>
  </div>
</template>
