<script setup lang="ts">
import { formatCurrency } from '#shared/utils/public-catalog'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Detalle de cliente', robots: 'noindex, nofollow' })
const route = useRoute()
type CustomerDetail = {
  id: string
  customerCode: string
  firstName: string
  lastName: string
  documentNumber: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  historicalOrderValue: string
  addresses: Array<{
    id: string
    label: string
    addressLine1: string
    city: string
    province: string
    reference: string
  }>
  orders: Array<{
    id: string
    orderNumber: string
    status: string
    total: string
    currency: string
    createdAt: string
  }>
  tickets: Array<{
    id: string
    ticketCode: string
    status: string
    createdAt: string
    service: { name: string }
  }>
}
const { data, status, error } = await useFetch<{ success: true; data: CustomerDetail }>(
  `/api/admin/customers/${route.params.id}`
)
const customer = computed(() => data.value?.data)
</script>

<template>
  <div>
    <AdminPageHeader title="Detalle de cliente" description="Datos, direcciones y actividad comercial."
      ><UButton to="/admin/clientes" label="Volver" variant="ghost"
    /></AdminPageHeader>
    <USkeleton v-if="status === 'pending'" class="h-72" /><UAlert
      v-else-if="error"
      color="error"
      title="No se pudo cargar el cliente"
    />
    <template v-else-if="customer"
      ><div class="grid gap-5 lg:grid-cols-3">
        <UCard class="bg-slate-900/70 ring-white/10"
          ><h2 class="text-xl font-bold">{{ customer.firstName }} {{ customer.lastName }}</h2>
          <p class="mt-1 font-mono text-cyan-300">{{ customer.customerCode }}</p>
          <dl class="mt-5 grid gap-2 text-sm">
            <div>
              <dt class="text-slate-500">Documento</dt>
              <dd>{{ customer.documentNumber || '—' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Email</dt>
              <dd>{{ customer.email || '—' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Teléfono</dt>
              <dd>{{ customer.phone || '—' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">WhatsApp</dt>
              <dd>{{ customer.whatsapp || '—' }}</dd>
            </div>
          </dl></UCard
        >
        <UCard class="bg-slate-900/70 ring-white/10"
          ><h2 class="text-xl font-bold">Resumen</h2>
          <p class="mt-5 text-sm text-slate-400">Pedidos</p>
          <p class="text-3xl font-black">{{ customer.orders.length }}</p>
          <p class="mt-4 text-sm text-slate-400">Valor histórico de pedidos no cancelados</p>
          <p class="text-2xl font-black">
            {{ formatCurrency(customer.historicalOrderValue, customer.orders[0]?.currency || 'USD') }}
          </p>
          <p class="mt-4 text-sm text-slate-400">Tickets</p>
          <p class="text-3xl font-black">{{ customer.tickets.length }}</p></UCard
        >
        <UCard class="bg-slate-900/70 ring-white/10"
          ><h2 class="text-xl font-bold">Direcciones</h2>
          <div
            v-for="address in customer.addresses"
            :key="address.id"
            class="mt-4 border-t border-white/10 pt-3 text-sm"
          >
            <p class="font-bold">{{ address.label }}</p>
            <p class="text-slate-400">
              {{ address.addressLine1 }}, {{ address.city }}, {{ address.province }}
            </p>
            <p class="text-slate-500">{{ address.reference }}</p>
          </div>
          <UEmpty v-if="!customer.addresses.length" title="Sin direcciones"
        /></UCard>
      </div>
      <div class="mt-6 grid gap-5 xl:grid-cols-2">
        <UCard class="overflow-x-auto bg-slate-900/70 ring-white/10"
          ><h2 class="mb-4 text-xl font-bold">Pedidos</h2>
          <table class="w-full min-w-130 text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in customer.orders" :key="order.id" class="border-t border-white/10">
                <td class="py-3">
                  <NuxtLink :to="`/admin/pedidos/${order.id}`" class="text-cyan-300">{{
                    order.orderNumber
                  }}</NuxtLink>
                </td>
                <td>{{ new Date(order.createdAt).toLocaleString('es-EC') }}</td>
                <td>{{ order.status }}</td>
                <td>{{ formatCurrency(order.total, order.currency) }}</td>
              </tr>
            </tbody>
          </table>
          <UEmpty v-if="!customer.orders.length" title="Sin pedidos"
        /></UCard>
        <UCard class="overflow-x-auto bg-slate-900/70 ring-white/10"
          ><h2 class="mb-4 text-xl font-bold">Tickets</h2>
          <table class="w-full min-w-130 text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th>Ticket</th>
                <th>Servicio</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ticket in customer.tickets" :key="ticket.id" class="border-t border-white/10">
                <td class="py-3">
                  <NuxtLink :to="`/admin/tickets/${ticket.id}`" class="text-cyan-300">{{
                    ticket.ticketCode
                  }}</NuxtLink>
                </td>
                <td>{{ ticket.service.name }}</td>
                <td>{{ ticket.status }}</td>
                <td>{{ new Date(ticket.createdAt).toLocaleString('es-EC') }}</td>
              </tr>
            </tbody>
          </table>
          <UEmpty v-if="!customer.tickets.length" title="Sin tickets"
        /></UCard>
      </div>
    </template>
  </div>
</template>
