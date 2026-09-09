<script setup lang="ts">
import { orderStatuses } from '#shared/schemas/order-admin.schema'
import { formatCurrency } from '#shared/utils/public-catalog'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Pedidos', robots: 'noindex, nofollow' })
type Row = {
  id: string
  orderNumber: string
  createdAt: string
  status: string
  deliveryType: string
  total: string
  currency: string
  whatsappOpenedAt: string | null
  customer: string
  itemCount: number
}
type PageData = { items: Row[]; pagination: { total: number; totalPages: number } }
const search = ref('')
const statusFilter = ref('')
const deliveryType = ref('')
const availabilitySource = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const page = ref(1)
const query = computed(() => ({
  page: page.value,
  pageSize: 20,
  search: search.value || undefined,
  status: statusFilter.value || undefined,
  deliveryType: deliveryType.value || undefined,
  availabilitySource: availabilitySource.value || undefined,
  dateFrom: dateFrom.value || undefined,
  dateTo: dateTo.value ? `${dateTo.value}T23:59:59.999Z` : undefined
}))
const { data, status, error } = await useFetch<{ success: true; data: PageData }>('/api/admin/orders', {
  query
})
const labels = orderStatusLabels
</script>

<template>
  <div>
    <AdminPageHeader title="Pedidos" description="Pedidos web, reservas y seguimiento comercial." />
    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <UInput v-model="search" icon="i-lucide-search" placeholder="ORD, cliente o contacto" />
      <select v-model="statusFilter" class="rounded-md border border-default bg-default px-3">
        <option value="">Todos los estados</option>
        <option v-for="item in orderStatuses" :key="item" :value="item">{{ labels[item] }}</option>
      </select>
      <select v-model="deliveryType" class="rounded-md border border-default bg-default px-3">
        <option value="">Toda entrega</option>
        <option value="PICKUP">Retiro</option>
        <option value="DELIVERY">Entrega</option>
      </select>
      <select v-model="availabilitySource" class="rounded-md border border-default bg-default px-3">
        <option value="">Toda disponibilidad</option>
        <option value="OWN_STOCK">Stock propio</option>
        <option value="SUPPLIER_STOCK">Proveedor</option>
      </select>
      <UInput v-model="dateFrom" type="date" aria-label="Fecha desde" />
      <UInput v-model="dateTo" type="date" aria-label="Fecha hasta" />
    </div>
    <UAlert v-if="error" color="error" title="No se pudieron cargar los pedidos" />
    <UCard class="overflow-x-auto bg-default ring-default">
      <div v-if="status === 'pending'" class="space-y-3">
        <USkeleton v-for="i in 6" :key="i" class="h-10" />
      </div>
      <table v-else class="w-full min-w-220 text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th class="p-3">Pedido</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Items</th>
            <th>Total</th>
            <th>Entrega</th>
            <th>Estado</th>
            <th>WhatsApp</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data.items" :key="item.id" class="border-t border-default">
            <td class="p-3 font-mono font-bold text-primary">{{ item.orderNumber }}</td>
            <td>{{ new Date(item.createdAt).toLocaleString('es-EC') }}</td>
            <td>{{ item.customer }}</td>
            <td>{{ item.itemCount }}</td>
            <td>{{ formatCurrency(item.total, item.currency) }}</td>
            <td>{{ item.deliveryType === 'PICKUP' ? 'Retiro' : 'Entrega' }}</td>
            <td><UBadge :label="labels[item.status]" variant="soft" /></td>
            <td>{{ item.whatsappOpenedAt ? 'Abierto' : 'Pendiente' }}</td>
            <td><UButton :to="`/admin/pedidos/${item.id}`" label="Abrir" variant="ghost" /></td>
          </tr>
        </tbody>
      </table>
      <UEmpty v-if="status !== 'pending' && !data?.data.items.length" title="Sin pedidos" />
    </UCard>
    <UPagination
      v-if="data?.data.pagination.totalPages"
      v-model:page="page"
      :total="data.data.pagination.total"
      :items-per-page="20"
      class="mt-4"
    />
  </div>
</template>
