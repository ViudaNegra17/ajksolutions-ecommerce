<script setup lang="ts">
import { PERMISSIONS } from '#shared/constants/permissions'
import { orderStatuses } from '#shared/schemas/order-admin.schema'
import { formatCurrency } from '#shared/utils/public-catalog'

const adminRequest = useAdminRequest()

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Detalle de pedido', robots: 'noindex, nofollow' })
const route = useRoute()
const { user } = useUserSession()
type AdminOrderDetail = {
  orderNumber: string
  createdAt: string
  status: string
  subtotal: string
  tax: string
  shipping: string
  total: string
  currency: string
  shippingPendingQuote: boolean
  deliveryType: string
  whatsappOpenedAt: string | null
  source: string
  notes: string | null
  customer: { firstName: string; lastName: string; whatsapp: string | null; email: string | null }
  deliveryAddress: null | {
    recipientName: string
    country: string
    province: string
    city: string
    addressLine1: string
    addressLine2: string | null
    reference: string
  }
  items: Array<{
    id: string
    productNameSnapshot: string
    variantSnapshot: string | null
    skuSnapshot: string
    quantity: number
    productTypeSnapshot: 'PHYSICAL' | 'DIGITAL'
    availabilitySource: string
    subtotal: string
    taxAmount: string
    total: string
  }>
  history: Array<{
    id: string
    fromStatus: string | null
    toStatus: string
    createdAt: string
    notes: string | null
    user: { firstName: string; lastName: string } | null
  }>
}
const { data, error, refresh } = await useFetch<{ success: true; data: AdminOrderDetail }>(
  `/api/admin/orders/${route.params.id}`
)
if (error.value)
  throw createError({ statusCode: error.value.statusCode || 500, statusMessage: 'Pedido no encontrado' })
const order = computed(() => data.value!.data)
const selectedStatus = ref(order.value.status)
const notes = ref('')
const saving = ref(false)
const labels = orderStatusLabels
const isSuper = computed(() => user.value?.roles.includes('SUPER_ADMIN'))
const canManage = computed(
  () => isSuper.value || user.value?.permissions.includes(PERMISSIONS.ORDERS_MANAGE_STATUS)
)
const canCancel = computed(() => isSuper.value || user.value?.permissions.includes(PERMISSIONS.ORDERS_CANCEL))
const allowedOptions = computed(() =>
  orderStatuses.filter((status) => status !== 'CANCELLED' || canCancel.value)
)
async function updateStatus() {
  saving.value = true
  try {
    await adminRequest(`/api/admin/orders/${route.params.id}/status`, {
      method: 'PUT',
      body: { status: selectedStatus.value, notes: notes.value }
    })
    notes.value = ''
    await refresh()
    selectedStatus.value = order.value.status
  } finally {
    saving.value = false
  }
}
function sourceLabel(source: string) {
  if (source === 'OWN_STOCK') return 'Stock propio'
  if (source === 'SUPPLIER_STOCK') return 'Bajo pedido proveedor'
  return 'Digital'
}
</script>

<template>
  <div>
    <AdminPageHeader
      :title="order.orderNumber"
      :description="`Creado ${new Date(order.createdAt).toLocaleString('es-EC')}`"
    />
    <div class="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div class="space-y-6">
        <UCard class="bg-default ring-default">
          <div class="flex flex-wrap justify-between gap-3">
            <div>
              <p class="text-sm text-muted">Cliente</p>
              <h2 class="text-xl font-black">{{ order.customer.firstName }} {{ order.customer.lastName }}</h2>
              <p class="text-sm text-default">
                {{ order.customer.whatsapp }} · {{ order.customer.email || 'Sin email' }}
              </p>
            </div>
            <UBadge :label="labels[order.status]" size="lg" />
          </div>
        </UCard>
        <UCard class="overflow-x-auto bg-default ring-default">
          <h2 class="mb-4 text-xl font-black">Items históricos</h2>
          <table class="admin-table w-full min-w-180 text-sm">
            <thead class="text-left text-muted">
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cantidad</th>
                <th>Fuente</th>
                <th>Subtotal</th>
                <th>IVA</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in order.items" :key="item.id" class="border-t border-default">
                <td class="py-3">
                  {{ item.productNameSnapshot
                  }}<span v-if="item.variantSnapshot" class="block text-xs text-muted">{{
                    item.variantSnapshot
                  }}</span>
                </td>
                <td>{{ item.skuSnapshot }}</td>
                <td>{{ item.quantity }}</td>
                <td>
                  {{ sourceLabel(item.availabilitySource) }}
                </td>
                <td>{{ formatCurrency(item.subtotal, order.currency) }}</td>
                <td>{{ formatCurrency(item.taxAmount, order.currency) }}</td>
                <td>{{ formatCurrency(item.total, order.currency) }}</td>
              </tr>
            </tbody>
          </table>
          <dl class="ml-auto mt-6 max-w-xs space-y-2">
            <div class="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{{ formatCurrency(order.subtotal, order.currency) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>IVA</dt>
              <dd>{{ formatCurrency(order.tax, order.currency) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>Envío</dt>
              <dd>
                {{
                  order.shippingPendingQuote
                    ? 'Por coordinar'
                    : formatCurrency(order.shipping, order.currency)
                }}
              </dd>
            </div>
            <div class="flex justify-between border-t border-default pt-3 text-lg font-black">
              <dt>Total</dt>
              <dd>{{ formatCurrency(order.total, order.currency) }}</dd>
            </div>
          </dl>
        </UCard>
        <UCard v-if="order.deliveryAddress" class="bg-default ring-default"
          ><h2 class="text-xl font-black">Dirección usada</h2>
          <p class="mt-3">{{ order.deliveryAddress.recipientName }}</p>
          <p class="text-default">
            {{ order.deliveryAddress.addressLine1
            }}<span v-if="order.deliveryAddress.addressLine2"
              >, {{ order.deliveryAddress.addressLine2 }}</span
            >
          </p>
          <p class="text-default">
            {{ order.deliveryAddress.city }}, {{ order.deliveryAddress.province }} ·
            {{ order.deliveryAddress.country }}
          </p>
          <p class="mt-2 text-sm text-muted">Referencia: {{ order.deliveryAddress.reference }}</p></UCard
        >
      </div>
      <div class="space-y-6">
        <UCard v-if="canManage || canCancel" class="bg-default ring-default"
          ><h2 class="text-xl font-black">Cambiar estado</h2>
          <select
            v-model="selectedStatus"
            data-testid="order-status"
            class="mt-4 w-full rounded-md border border-default bg-default px-3 py-2"
          >
            <option v-for="status in allowedOptions" :key="status" :value="status">
              {{ labels[status] }}
            </option></select
          ><UTextarea v-model="notes" class="mt-3 w-full" placeholder="Nota del cambio" /><UButton
            label="Guardar estado"
            block
            class="mt-4"
            :loading="saving"
            @click="updateStatus"
        /></UCard>
        <UCard class="bg-default ring-default"
          ><h2 class="text-xl font-black">Operación</h2>
          <dl class="mt-4 space-y-3 text-sm">
            <div class="flex justify-between">
              <dt>Entrega</dt>
              <dd>
                {{
                  order.deliveryType === 'PICKUP'
                    ? 'Retiro'
                    : order.deliveryType === 'DIGITAL'
                      ? 'Digital'
                      : 'Entrega'
                }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt>WhatsApp</dt>
              <dd>
                {{
                  order.whatsappOpenedAt
                    ? new Date(order.whatsappOpenedAt).toLocaleString('es-EC')
                    : 'No abierto'
                }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt>Origen</dt>
              <dd>{{ adminLabel(order.source) }}</dd>
            </div>
          </dl>
          <p v-if="order.notes" class="mt-4 border-t border-default pt-4 text-sm text-default">
            {{ order.notes }}
          </p></UCard
        >
        <UCard class="bg-default ring-default"
          ><h2 class="text-xl font-black">Historial</h2>
          <ol class="mt-4 space-y-4">
            <li v-for="item in order.history" :key="item.id" class="border-l border-primary pl-4">
              <p class="font-semibold">
                {{ item.fromStatus ? `${labels[item.fromStatus]} → ` : '' }}{{ labels[item.toStatus] }}
              </p>
              <p class="text-xs text-muted">
                {{ new Date(item.createdAt).toLocaleString('es-EC')
                }}<span v-if="item.user"> · {{ item.user.firstName }} {{ item.user.lastName }}</span>
              </p>
              <p v-if="item.notes" class="mt-1 text-sm text-default">{{ item.notes }}</p>
            </li>
          </ol></UCard
        >
      </div>
    </div>
  </div>
</template>
