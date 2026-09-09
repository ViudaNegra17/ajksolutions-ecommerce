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
    <p v-if="price.mode === 'QUOTE'" class="text-lg font-bold text-primary">Solicitar cotización</p>
    <p v-else class="text-lg font-black text-highlighted">
      <span v-if="price.mode === 'FROM'" class="mr-1 text-sm font-medium text-muted">Desde</span
      >{{ formatted }}
    </p>
    <p v-if="price.amount" class="text-xs text-muted">Precio final calculado con impuestos.</p>
  </div>
</template>
