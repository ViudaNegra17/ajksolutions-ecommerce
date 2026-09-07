<script setup lang="ts">
import type { PublicOrderResult } from '#shared/types/orders'
import { formatCurrency } from '#shared/utils/public-catalog'

useSeoMeta({ title: 'Pedido registrado', robots: 'noindex, nofollow' })
const order = ref<PublicOrderResult | null>(null)
const opening = ref(false)
onMounted(() => {
  try {
    order.value = JSON.parse(sessionStorage.getItem('ajksolutions-order-result') || 'null')
  } catch {
    order.value = null
  }
})
async function openWhatsApp() {
  if (!order.value || opening.value) return
  opening.value = true
  try {
    await $fetch('/api/orders/whatsapp-opened', {
      method: 'POST',
      body: { orderNumber: order.value.orderNumber, handoffToken: order.value.handoffToken }
    })
    window.open(order.value.whatsappUrl, '_blank', 'noopener,noreferrer')
  } finally {
    opening.value = false
  }
}
</script>

<template>
  <UContainer class="py-16">
    <UCard v-if="order" class="mx-auto max-w-2xl bg-slate-900/70 text-center ring-white/10">
      <div class="mx-auto grid size-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
        <UIcon name="i-lucide-circle-check" class="size-9" />
      </div>
      <h1 class="mt-6 text-3xl font-black">Pedido registrado</h1>
      <p class="mt-3 text-slate-300">
        Tu pedido <strong class="font-mono text-cyan-300">{{ order.orderNumber }}</strong> ya existe en
        nuestro sistema.
      </p>
      <p class="mt-3 text-2xl font-black">{{ formatCurrency(order.total, order.currency) }}</p>
      <p class="mt-2 text-sm text-slate-400">WhatsApp es opcional y no sustituye el registro del pedido.</p>
      <UAlert
        v-if="order.hasDigitalItems"
        class="mt-5 text-left"
        color="info"
        title="Entrega digital pendiente"
        description="Procesaremos los productos digitales de forma segura. Ninguna clave se muestra en esta página."
      />
      <UButton
        label="Continuar por WhatsApp"
        icon="i-lucide-message-circle"
        size="xl"
        class="mt-7"
        :loading="opening"
        @click="openWhatsApp"
      />
      <UButton to="/productos" label="Volver al catálogo" variant="ghost" class="mt-3" />
    </UCard>
    <UCard v-else class="mx-auto max-w-2xl bg-slate-900/70 ring-white/10">
      <UEmpty
        title="No hay un pedido reciente en esta sesión"
        description="Por privacidad no consultamos pedidos usando únicamente el número ORD."
      >
        <template #actions><UButton to="/productos" label="Ver productos" /></template>
      </UEmpty>
    </UCard>
  </UContainer>
</template>
