<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type { CheckoutPreview, PublicOrderResult } from '#shared/types/orders'
import { formatCurrency } from '#shared/utils/public-catalog'

useSeoMeta({ title: 'Finalizar pedido', robots: 'noindex, nofollow' })
const cart = useCartStore()
const startedAt = ref(Date.now())
const requestId = ref('')
const loadingPreview = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const preview = ref<CheckoutPreview | null>(null)
const deliveryType = ref<'PICKUP' | 'DELIVERY' | 'DIGITAL'>('PICKUP')
const customer = reactive({
  firstName: '',
  lastName: '',
  documentType: '',
  documentNumber: '',
  email: '',
  phone: '',
  whatsapp: ''
})
const address = reactive({
  label: 'Principal',
  recipientName: '',
  country: 'EC',
  province: '',
  city: '',
  addressLine1: '',
  addressLine2: '',
  reference: '',
  postalCode: '',
  phone: ''
})
const notes = ref('')
const website = ref('')
const itemsPayload = computed(() =>
  cart.items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity }))
)
const hasPhysical = computed(() => cart.items.some((item) => item.productType === 'PHYSICAL'))
const hasDigital = computed(() => cart.items.some((item) => item.productType !== 'PHYSICAL'))
const digitalOnly = computed(() => hasDigital.value && !hasPhysical.value)

function sourceLabel(source: CheckoutPreview['items'][number]['availabilitySource']) {
  if (source === 'OWN_STOCK') return 'Stock propio reservado al confirmar'
  if (source === 'SUPPLIER_STOCK') return 'Disponible bajo pedido'
  return 'Entrega digital'
}

function readableError(error: unknown) {
  const value = error as { data?: { data?: { error?: { message?: string } }; statusMessage?: string } }
  return value.data?.data?.error?.message || value.data?.statusMessage || 'No se pudo procesar el checkout.'
}

async function refreshPreview() {
  if (!cart.items.length) {
    preview.value = null
    return
  }
  loadingPreview.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<ApiSuccess<CheckoutPreview>>('/api/checkout/preview', {
      method: 'POST',
      body: { items: itemsPayload.value, deliveryType: deliveryType.value }
    })
    preview.value = response.data
  } catch (error) {
    preview.value = null
    errorMessage.value = readableError(error)
  } finally {
    loadingPreview.value = false
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
        items: itemsPayload.value,
        checkoutFingerprint: preview.value.checkoutFingerprint,
        customer,
        deliveryType: deliveryType.value,
        address:
          deliveryType.value === 'DELIVERY'
            ? {
                ...address,
                recipientName: address.recipientName || `${customer.firstName} ${customer.lastName}`
              }
            : null,
        notes: notes.value,
        website: website.value,
        startedAt: startedAt.value
      }
    })
    sessionStorage.setItem('ajksolutions-order-result', JSON.stringify(response.data))
    cart.clearCart()
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
  cart.hydrate()
  if (digitalOnly.value) deliveryType.value = 'DIGITAL'
  await refreshPreview()
})
watch(deliveryType, refreshPreview)
</script>

<template>
  <UContainer class="py-10">
    <div class="mb-8">
      <p class="text-sm font-bold uppercase tracking-widest text-cyan-400">Checkout invitado</p>
      <h1 class="mt-2 text-4xl font-black">Finalizar pedido</h1>
      <p class="mt-3 text-slate-400">
        El servidor validará nuevamente precios, impuestos y stock al confirmar.
      </p>
    </div>
    <UAlert
      v-if="errorMessage"
      color="error"
      title="No se pudo continuar"
      :description="errorMessage"
      class="mb-6"
    />
    <UCard v-if="cart.hydrated && !cart.items.length" class="bg-slate-900/70 ring-white/10">
      <UEmpty
        title="No hay productos para finalizar"
        description="El carrito permanece disponible cuando un checkout falla."
      >
        <template #actions><UButton to="/productos" label="Ver productos" /></template>
      </UEmpty>
    </UCard>
    <form
      v-else-if="cart.hydrated"
      class="grid gap-7 lg:grid-cols-[1fr_380px]"
      @submit.prevent="confirmOrder"
    >
      <div class="space-y-6">
        <UCard class="bg-slate-900/70 ring-white/10">
          <h2 class="text-xl font-black">1. Datos del cliente</h2>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <UFormField label="Nombres" required
              ><UInput v-model="customer.firstName" required minlength="2"
            /></UFormField>
            <UFormField label="Apellidos" required
              ><UInput v-model="customer.lastName" required minlength="2"
            /></UFormField>
            <UFormField label="Tipo de documento"><UInput v-model="customer.documentType" /></UFormField>
            <UFormField label="Documento"><UInput v-model="customer.documentNumber" /></UFormField>
            <UFormField label="Email" :required="hasDigital"
              ><UInput v-model="customer.email" type="email" :required="hasDigital"
            /></UFormField>
            <UFormField label="Teléfono"><UInput v-model="customer.phone" type="tel" /></UFormField>
            <UFormField label="WhatsApp" required class="sm:col-span-2"
              ><UInput v-model="customer.whatsapp" type="tel" required minlength="8"
            /></UFormField>
            <input v-model="website" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true" />
          </div>
        </UCard>
        <UCard class="bg-slate-900/70 ring-white/10">
          <h2 class="text-xl font-black">2. Entrega</h2>
          <UAlert
            v-if="digitalOnly"
            class="mt-5"
            color="info"
            title="Entrega digital"
            description="Recibirás la entrega mediante el correo registrado después de su confirmación."
          />
          <div v-else class="mt-5 grid gap-3 sm:grid-cols-2">
            <label class="flex cursor-pointer gap-3 rounded-xl border border-white/10 p-4">
              <input v-model="deliveryType" type="radio" value="PICKUP" />
              <span
                ><strong>Retiro</strong
                ><span class="block text-sm text-slate-400">Coordinar retiro en tienda</span></span
              >
            </label>
            <label class="flex cursor-pointer gap-3 rounded-xl border border-white/10 p-4">
              <input v-model="deliveryType" type="radio" value="DELIVERY" />
              <span
                ><strong>Entrega</strong
                ><span class="block text-sm text-slate-400">Envío por coordinar</span></span
              >
            </label>
          </div>
          <div v-if="deliveryType === 'DELIVERY'" class="mt-5 grid gap-4 sm:grid-cols-2">
            <UFormField label="Provincia" required><UInput v-model="address.province" required /></UFormField>
            <UFormField label="Ciudad" required><UInput v-model="address.city" required /></UFormField>
            <UFormField label="Dirección" required class="sm:col-span-2"
              ><UInput v-model="address.addressLine1" required
            /></UFormField>
            <UFormField label="Detalle adicional" class="sm:col-span-2"
              ><UInput v-model="address.addressLine2"
            /></UFormField>
            <UFormField label="Referencia" required class="sm:col-span-2"
              ><UTextarea v-model="address.reference" required
            /></UFormField>
          </div>
        </UCard>
        <UCard class="bg-slate-900/70 ring-white/10">
          <h2 class="text-xl font-black">3. Notas</h2>
          <UTextarea
            v-model="notes"
            class="mt-4 w-full"
            placeholder="Indicaciones opcionales para el pedido"
          />
        </UCard>
      </div>
      <UCard class="h-fit bg-slate-900/70 ring-white/10 lg:sticky lg:top-24">
        <h2 class="text-xl font-black">4. Resumen confirmado</h2>
        <div v-if="loadingPreview" class="mt-5 space-y-3">
          <USkeleton v-for="i in 4" :key="i" class="h-12" />
        </div>
        <template v-else-if="preview">
          <div class="mt-5 space-y-4">
            <div
              v-for="item in preview.items"
              :key="`${item.productId}:${item.variantId || ''}`"
              class="border-b border-white/10 pb-4"
            >
              <div class="flex justify-between gap-4">
                <span>{{ item.quantity }} × {{ item.productName }}</span
                ><strong>{{ formatCurrency(item.total, preview.currency) }}</strong>
              </div>
              <p v-if="item.variantName" class="text-xs text-slate-400">{{ item.variantName }}</p>
              <p class="text-xs text-cyan-300">
                {{ sourceLabel(item.availabilitySource) }}
              </p>
            </div>
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
              <dd>
                {{
                  preview.shippingPendingQuote
                    ? 'Por coordinar'
                    : formatCurrency(preview.shipping, preview.currency)
                }}
              </dd>
            </div>
            <div class="flex justify-between border-t border-white/10 pt-4 text-lg font-black">
              <dt>Total</dt>
              <dd>{{ formatCurrency(preview.total, preview.currency) }}</dd>
            </div>
          </dl>
          <UAlert
            v-for="warning in preview.warnings"
            :key="warning"
            color="warning"
            :description="warning"
            class="mt-4"
          />
          <UButton
            type="submit"
            label="Confirmar pedido"
            block
            size="xl"
            class="mt-6"
            :loading="submitting"
            data-testid="confirm-order"
          />
        </template>
        <UButton to="/carrito" label="Volver al carrito" block variant="ghost" class="mt-2" />
      </UCard>
    </form>
  </UContainer>
</template>
