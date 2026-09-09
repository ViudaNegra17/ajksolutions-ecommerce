<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type { CheckoutPreview, PublicOrderResult } from '#shared/types/orders'
import type { PublicProductDetail } from '#shared/types/public-catalog'
import { formatCurrency } from '#shared/utils/public-catalog'

useSeoMeta({ title: 'Comprar producto digital', robots: 'noindex, nofollow' })
const route = useRoute()
const slug = String(route.params.slug)
const { data, error } = await useAsyncData(`buy-license-${slug}`, () =>
  $fetch<ApiSuccess<PublicProductDetail>>(`/api/products/${slug}`)
)
if (error.value || data.value?.data.productType !== 'DIGITAL' || data.value.data.price.mode !== 'FIXED') {
  throw createError({ statusCode: 404, statusMessage: 'Producto digital no disponible para compra directa' })
}
const product = computed(() => data.value!.data)
const requestedVariantId = typeof route.query.variant === 'string' ? route.query.variant : null
const requestedVariant = computed(() =>
  product.value.variants.find((variant) => variant.id === requestedVariantId)
)
const selectedVariant = computed(() =>
  product.value.variants.length ? requestedVariant.value || product.value.variants[0]! : null
)
const buyNow = useBuyNowStore()
const startedAt = ref(Date.now())
const requestId = ref('')
const preview = ref<CheckoutPreview | null>(null)
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const customer = reactive({ firstName: '', lastName: '', email: '', whatsapp: '' })
const website = ref('')
const itemPayload = computed(() => ({
  productId: product.value.id,
  variantId: selectedVariant.value?.id || null,
  quantity: 1
}))

function readableError(error: unknown) {
  return uiErrorMessage(error)
}

async function refreshPreview() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<ApiSuccess<CheckoutPreview>>('/api/checkout/preview', {
      method: 'POST',
      body: { items: [itemPayload.value], deliveryType: 'DIGITAL' }
    })
    preview.value = response.data
  } catch (error) {
    preview.value = null
    errorMessage.value = readableError(error)
  } finally {
    loading.value = false
  }
}

async function confirmOrder() {
  if (!preview.value || submitting.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<ApiSuccess<PublicOrderResult>>('/api/orders', {
      method: 'POST',
      body: {
        requestId: requestId.value,
        items: [itemPayload.value],
        checkoutFingerprint: preview.value.checkoutFingerprint,
        customer,
        deliveryType: 'DIGITAL',
        address: null,
        website: website.value,
        startedAt: startedAt.value
      }
    })
    sessionStorage.setItem('ajksolutions-order-result', JSON.stringify(response.data))
    buyNow.clear()
    await navigateTo('/pedido/confirmado')
  } catch (error) {
    errorMessage.value = readableError(error)
    await refreshPreview()
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  requestId.value = crypto.randomUUID()
  buyNow.hydrate()
  buyNow.start(product.value.id, selectedVariant.value?.id || null)
  await refreshPreview()
})
</script>

<template>
  <UContainer class="py-10">
    <PublicBreadcrumbs
      :items="[
        { name: 'Productos', path: '/productos' },
        { name: product.name, path: `/productos/${product.slug}` },
        { name: 'Comprar', path: `/productos/${product.slug}/comprar` }
      ]"
    />
    <div class="mt-7">
      <p class="text-sm font-bold uppercase tracking-widest text-primary">Compra directa</p>
      <h1 class="mt-2 text-4xl font-black">Comprar producto digital</h1>
      <p class="mt-3 text-muted">
        Compra individual, coordinación por WhatsApp, sin dirección ni costo de envío.
      </p>
    </div>
    <UAlert
      v-if="errorMessage"
      class="mt-6"
      color="error"
      title="No se pudo continuar"
      :description="errorMessage"
    />
    <form class="mt-8 grid gap-7 lg:grid-cols-[1fr_380px]" @submit.prevent="confirmOrder">
      <UCard class="h-fit bg-default ring-default">
        <h2 class="text-xl font-black">Datos del cliente</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Nombres" required>
            <UInput v-model="customer.firstName" required minlength="2" />
          </UFormField>
          <UFormField label="Apellidos" required>
            <UInput v-model="customer.lastName" required minlength="2" />
          </UFormField>
          <UFormField label="Email" required>
            <UInput v-model="customer.email" type="email" required />
          </UFormField>
          <UFormField label="WhatsApp" required>
            <UInput v-model="customer.whatsapp" type="tel" required minlength="8" />
          </UFormField>
          <input v-model="website" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true" />
        </div>
        <UAlert
          class="mt-6"
          color="info"
          title="Entrega digital"
          description="Después de confirmar el pedido, el vendedor coordinará el pago y entregará manualmente el producto digital por WhatsApp."
        />
      </UCard>
      <UCard class="h-fit bg-default ring-default lg:sticky lg:top-24">
        <h2 class="text-xl font-black">Resumen</h2>
        <div v-if="loading" class="mt-5 space-y-3">
          <USkeleton v-for="index in 4" :key="index" class="h-10" />
        </div>
        <template v-else-if="preview">
          <div class="mt-5 border-b border-default pb-4">
            <div class="flex justify-between gap-4">
              <span>{{ product.name }}</span>
              <strong>{{ formatCurrency(preview.total, preview.currency) }}</strong>
            </div>
            <p v-if="selectedVariant" class="mt-1 text-xs text-muted">{{ selectedVariant.name }}</p>
            <p class="mt-2 text-xs text-primary">Cantidad: 1 · Entrega digital</p>
          </div>
          <dl class="mt-5 space-y-2 text-sm">
            <div class="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{{ formatCurrency(preview.subtotal, preview.currency) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>IVA</dt>
              <dd>{{ formatCurrency(preview.tax, preview.currency) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>Envío</dt>
              <dd>{{ formatCurrency(preview.shipping, preview.currency) }}</dd>
            </div>
            <div class="flex justify-between border-t border-default pt-4 text-lg font-black">
              <dt>Total</dt>
              <dd>{{ formatCurrency(preview.total, preview.currency) }}</dd>
            </div>
          </dl>
          <UButton
            type="submit"
            label="Confirmar compra"
            icon="i-lucide-shield-check"
            block
            size="xl"
            class="mt-6"
            :loading="submitting"
            data-testid="confirm-license-order"
          />
        </template>
        <UButton
          :to="`/productos/${product.slug}`"
          label="Volver al producto"
          block
          variant="ghost"
          class="mt-2"
        />
      </UCard>
    </form>
  </UContainer>
</template>
