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
        size === 'lg' ? 'text-3xl text-white' : 'text-lg text-white',
        price.mode === 'CONTACT' ? 'text-cyan-300' : ''
      ]"
    >
      {{ formatCurrency(price.amount, price.currency) }}
    </p>
    <p v-if="price.mode === 'FIXED' && price.taxIncludedInDisplayedPrice" class="mt-1 text-xs text-slate-500">
      Impuestos incluidos según configuración del producto
    </p>
  </div>
</template>
