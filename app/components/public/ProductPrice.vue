<script setup lang="ts">
import type { PublicPrice } from '#shared/types/public-catalog'
import { formatCurrency } from '#shared/utils/public-catalog'

defineProps<{ price: PublicPrice; size?: 'sm' | 'lg' }>()
</script>

<template>
  <div>
    <p
      :class="[
        'font-black tracking-tight',
        size === 'lg' ? 'text-3xl text-highlighted' : 'text-lg text-highlighted',
        price.mode === 'CONTACT' ? 'text-primary' : ''
      ]"
    >
      {{ formatCurrency(price.amount, price.currency) }}
    </p>
    <p v-if="price.mode === 'FIXED' && price.taxIncludedInDisplayedPrice" class="mt-1 text-xs text-muted">
      Impuestos incluidos según configuración del producto
    </p>
  </div>
</template>
