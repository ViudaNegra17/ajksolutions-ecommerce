<script setup lang="ts">
import type { PublicAvailability } from '#shared/types/public-catalog'
import { availabilityLabel } from '#shared/utils/public-catalog'

defineProps<{ availability: PublicAvailability }>()
</script>

<template>
  <div class="flex items-start gap-2 text-sm">
    <span
      :class="[
        'mt-1 size-2 shrink-0 rounded-full',
        availability.source === 'DIGITAL'
          ? 'bg-cyan-400'
          : availability.source === 'OWN_STOCK'
            ? 'bg-emerald-400'
            : availability.source === 'SUPPLIER_STOCK'
              ? 'bg-amber-400'
              : 'bg-slate-500'
      ]"
    />
    <div>
      <p class="font-medium text-slate-200">{{ availabilityLabel(availability.source) }}</p>
      <p
        v-if="availability.source === 'SUPPLIER_STOCK' && availability.estimatedLeadTimeDays"
        class="text-xs text-slate-500"
      >
        Entrega estimada: {{ availability.estimatedLeadTimeDays }} días
      </p>
    </div>
  </div>
</template>
