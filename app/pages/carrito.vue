<script setup lang="ts">
import { formatCurrency } from '#shared/utils/public-catalog'

useSeoMeta({ title: 'Carrito', description: 'Revisa los productos de tu pedido.' })
const cart = useCartStore()
onMounted(() => cart.hydrate())
const estimatedTotal = computed(() =>
  cart.items.reduce((sum, item) => sum + Number(item.displayPrice) * item.quantity, 0)
)
</script>

<template>
  <UContainer class="py-10">
    <div class="mb-8">
      <p class="text-sm font-bold uppercase tracking-widest text-primary">Compra</p>
      <h1 class="mt-2 text-4xl font-black">Tu carrito</h1>
      <p class="mt-3 text-muted">Los precios y la disponibilidad se actualizarán al finalizar el pedido.</p>
    </div>
    <UCard v-if="cart.hydrated && !cart.items.length" class="bg-default ring-default">
      <UEmpty title="Tu carrito está vacío" description="Explora el catálogo para agregar productos.">
        <template #actions><UButton to="/productos" label="Ver productos" /></template>
      </UEmpty>
    </UCard>
    <div v-else-if="cart.hydrated" class="grid gap-7 lg:grid-cols-[1fr_320px]">
      <div class="space-y-4">
        <UCard
          v-for="item in cart.items"
          :key="`${item.productId}:${item.variantId || ''}`"
          class="bg-default ring-default"
        >
          <div class="grid gap-4 sm:grid-cols-[88px_1fr_auto] sm:items-center">
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.name"
              class="size-22 rounded-xl object-cover"
            />
            <div v-else class="grid size-22 place-items-center rounded-xl bg-default">
              <UIcon name="i-lucide-image" />
            </div>
            <div>
              <NuxtLink :to="`/productos/${item.slug}`" class="font-bold hover:text-primary">{{
                item.name
              }}</NuxtLink>
              <p v-if="item.variantName" class="text-sm text-muted">{{ item.variantName }}</p>
              <p class="mt-2 font-semibold">{{ formatCurrency(item.displayPrice) }} estimado</p>
            </div>
            <div class="flex items-center gap-3">
              <UInput
                :model-value="item.quantity"
                type="number"
                min="1"
                max="99"
                class="w-20"
                :aria-label="`Cantidad de ${item.name}`"
                @update:model-value="cart.updateQuantity(item.productId, item.variantId, Number($event))"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                aria-label="Eliminar"
                @click="cart.removeItem(item.productId, item.variantId)"
              />
            </div>
          </div>
        </UCard>
      </div>
      <UCard class="h-fit bg-default ring-default lg:sticky lg:top-24">
        <h2 class="text-xl font-black">Resumen estimado</h2>
        <div class="mt-5 flex justify-between border-t border-default pt-5 text-lg font-bold">
          <span>Total estimado</span><span>{{ formatCurrency(estimatedTotal) }}</span>
        </div>
        <p class="mt-3 text-xs text-muted">
          Revisa el precio final, los impuestos y la entrega antes de confirmar.
        </p>
        <UButton to="/checkout" label="Finalizar pedido" block size="xl" class="mt-6" />
        <UButton to="/productos" label="Continuar compra" block variant="ghost" class="mt-2" />
      </UCard>
    </div>
    <div v-else class="space-y-3"><USkeleton v-for="i in 3" :key="i" class="h-28" /></div>
  </UContainer>
</template>
