<script setup lang="ts">
import { PERMISSIONS } from '#shared/constants/permissions'
import { formatCurrency } from '#shared/utils/public-catalog'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Dashboard operativo', robots: 'noindex, nofollow' })
const period = ref<'today' | '7d' | '30d' | 'month'>('30d')
const { user } = useUserSession()
type DashboardData = {
  range: { timeZone: string }
  orders: { new: number; pending: number; confirmed: number; delivered: number }
  tickets: { new: number; open: number }
  customers: number
  products: number
  money: { orderValue: string; confirmedValue: string; deliveredValue: string; currency: string }
  lowStock: {
    threshold: number
    items: Array<{
      id: string
      productCode: string
      name: string
      onHand: number
      reserved: number
      available: number
    }>
  }
  supplierOnly: number
  alerts: {
    oldReservedOrders: number
    oldNewTickets: number
    productsWithoutImage: number
    contactFeatured: number
  }
  recentOrders: Array<{
    id: string
    orderNumber: string
    customer: string
    total: string
    currency: string
    deliveryType: string
    status: string
    createdAt: string
  }>
  recentTickets: Array<{
    id: string
    ticketCode: string
    customer: string
    service: string
    priority: string
    status: string
    createdAt: string
  }>
}
const { data, status, error, refresh } = await useFetch<{ success: true; data: DashboardData }>(
  '/api/admin/dashboard',
  {
    query: computed(() => ({ period: period.value }))
  }
)
const dashboard = computed(() => data.value?.data)
const permitted = (permission: string) =>
  user.value?.roles.includes('SUPER_ADMIN') || user.value?.permissions.includes(permission)
const actions = computed(() =>
  [
    [
      'Nuevo producto',
      '/admin/catalogo/productos/nuevo',
      'i-lucide-package-plus',
      PERMISSIONS.PRODUCTS_CREATE
    ],
    ['Nuevo servicio', '/admin/servicios/nuevo', 'i-lucide-wrench', PERMISSIONS.SERVICES_CREATE],
    ['Ver pedidos', '/admin/pedidos', 'i-lucide-shopping-bag', PERMISSIONS.ORDERS_VIEW],
    ['Ver tickets', '/admin/tickets', 'i-lucide-ticket-check', PERMISSIONS.TICKETS_VIEW],
    ['Ver clientes', '/admin/clientes', 'i-lucide-users', PERMISSIONS.CUSTOMERS_MANAGE],
    ['Ajustar inventario', '/admin/catalogo/inventario', 'i-lucide-warehouse', PERMISSIONS.INVENTORY_ADJUST]
  ].filter((item) => permitted(item[3]!))
)
const orderLabels: Record<string, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  CONFIRMED: 'Confirmado',
  PAYMENT_PENDING: 'Pago pendiente',
  PAID: 'Pagado',
  PREPARING: 'Preparando',
  READY: 'Listo',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado'
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Dashboard operativo"
      description="Indicadores derivados de pedidos, tickets, clientes e inventario real."
    >
      <select
        v-model="period"
        aria-label="Período"
        class="rounded-md border border-white/15 bg-slate-900 px-3 py-2"
      >
        <option value="today">Hoy</option>
        <option value="7d">7 días</option>
        <option value="30d">30 días</option>
        <option value="month">Este mes</option>
      </select>
    </AdminPageHeader>
    <UAlert
      v-if="error"
      color="error"
      title="No se pudo cargar el dashboard"
      :actions="[{ label: 'Reintentar', onClick: () => refresh() }]"
    />
    <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <USkeleton v-for="i in 8" :key="i" class="h-28 rounded-2xl" />
    </div>
    <template v-else-if="dashboard">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UCard
          v-for="metric in [
            ['Pedidos nuevos', dashboard.orders.new, 'i-lucide-shopping-bag'],
            ['Pedidos pendientes', dashboard.orders.pending, 'i-lucide-clock'],
            ['Pedidos confirmados', dashboard.orders.confirmed, 'i-lucide-circle-check'],
            ['Pedidos entregados', dashboard.orders.delivered, 'i-lucide-package-check'],
            ['Tickets nuevos', dashboard.tickets.new, 'i-lucide-ticket'],
            ['Tickets abiertos', dashboard.tickets.open, 'i-lucide-ticket-check'],
            ['Clientes registrados', dashboard.customers, 'i-lucide-users'],
            ['Productos activos', dashboard.products, 'i-lucide-package']
          ]"
          :key="metric[0]"
          class="bg-slate-900/70 ring-white/10"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-400">{{ metric[0] }}</p>
              <p class="mt-2 text-3xl font-black">{{ metric[1] }}</p>
            </div>
            <UIcon :name="String(metric[2])" class="size-7 text-cyan-400" />
          </div>
        </UCard>
      </div>
      <div class="mt-5 grid gap-4 lg:grid-cols-3">
        <UCard
          v-for="money in [
            ['Valor de pedidos', dashboard.money.orderValue],
            ['Ventas confirmadas', dashboard.money.confirmedValue],
            ['Valor de pedidos entregados', dashboard.money.deliveredValue]
          ]"
          :key="money[0]"
          class="bg-gradient-to-br from-cyan-950/60 to-slate-900 ring-cyan-500/20"
        >
          <p class="text-sm text-cyan-200">{{ money[0] }}</p>
          <p class="mt-2 text-3xl font-black">
            {{ formatCurrency(String(money[1]), dashboard.money.currency) }}
          </p>
        </UCard>
      </div>
      <section class="mt-8">
        <h2 class="text-xl font-bold">Accesos rápidos</h2>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton
            v-for="action in actions"
            :key="action[1]"
            :to="action[1]"
            :label="action[0]"
            :icon="action[2]"
            variant="soft"
          />
        </div>
      </section>
      <div class="mt-8 grid gap-6 xl:grid-cols-2">
        <UCard class="overflow-x-auto bg-slate-900/70 ring-white/10"
          ><h2 class="mb-4 text-xl font-bold">Últimos pedidos</h2>
          <table class="w-full min-w-160 text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th>ORD</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in dashboard.recentOrders" :key="item.id" class="border-t border-white/10">
                <td class="py-3">
                  <NuxtLink :to="`/admin/pedidos/${item.id}`" class="font-mono text-cyan-300">{{
                    item.orderNumber
                  }}</NuxtLink>
                </td>
                <td>{{ item.customer }}</td>
                <td>{{ formatCurrency(item.total, item.currency) }}</td>
                <td>{{ item.deliveryType }}</td>
                <td>{{ orderLabels[item.status] }}</td>
                <td>{{ new Date(item.createdAt).toLocaleString('es-EC') }}</td>
              </tr>
            </tbody>
          </table>
          <UEmpty v-if="!dashboard.recentOrders.length" title="Sin pedidos en el período"
        /></UCard>
        <UCard class="overflow-x-auto bg-slate-900/70 ring-white/10"
          ><h2 class="mb-4 text-xl font-bold">Tickets recientes</h2>
          <table class="w-full min-w-160 text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th>TCK</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in dashboard.recentTickets" :key="item.id" class="border-t border-white/10">
                <td class="py-3">
                  <NuxtLink :to="`/admin/tickets/${item.id}`" class="font-mono text-cyan-300">{{
                    item.ticketCode
                  }}</NuxtLink>
                </td>
                <td>{{ item.customer }}</td>
                <td>{{ item.service }}</td>
                <td>{{ item.priority }}</td>
                <td>{{ item.status }}</td>
                <td>{{ new Date(item.createdAt).toLocaleString('es-EC') }}</td>
              </tr>
            </tbody>
          </table>
          <UEmpty v-if="!dashboard.recentTickets.length" title="Sin tickets en el período"
        /></UCard>
      </div>
      <div class="mt-8 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <UCard class="overflow-x-auto bg-slate-900/70 ring-white/10"
          ><div class="flex items-center justify-between">
            <h2 class="text-xl font-bold">Stock bajo</h2>
            <UBadge :label="`Disponible ≤ ${dashboard.lowStock.threshold}`" variant="soft" />
          </div>
          <table class="mt-4 w-full min-w-140 text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th>Producto</th>
                <th>En mano</th>
                <th>Reservado</th>
                <th>Disponible</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in dashboard.lowStock.items" :key="item.id" class="border-t border-white/10">
                <td class="py-3">{{ item.productCode }} · {{ item.name }}</td>
                <td>{{ item.onHand }}</td>
                <td>{{ item.reserved }}</td>
                <td><UBadge :label="String(item.available)" color="warning" /></td>
              </tr>
            </tbody>
          </table>
          <UEmpty v-if="!dashboard.lowStock.items.length" title="Sin alertas de stock propio"
        /></UCard>
        <UCard class="bg-slate-900/70 ring-white/10"
          ><h2 class="text-xl font-bold">Alertas operativas</h2>
          <dl class="mt-4 grid gap-3 text-sm">
            <div class="flex justify-between">
              <dt>Reservas antiguas</dt>
              <dd>{{ dashboard.alerts.oldReservedOrders }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>Tickets NEW antiguos</dt>
              <dd>{{ dashboard.alerts.oldNewTickets }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>Productos sin imagen</dt>
              <dd>{{ dashboard.alerts.productsWithoutImage }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>CONTACT destacados</dt>
              <dd>{{ dashboard.alerts.contactFeatured }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>Sin stock propio, con proveedor</dt>
              <dd>{{ dashboard.supplierOnly }}</dd>
            </div>
          </dl></UCard
        >
      </div>
      <p class="mt-5 text-xs text-slate-500">
        Período calculado en {{ dashboard.range.timeZone }}. Los cancelados no integran valores monetarios.
      </p>
    </template>
  </div>
</template>
