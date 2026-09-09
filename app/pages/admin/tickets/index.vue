<script setup lang="ts">
import { ticketPriorities, ticketStatuses } from '#shared/schemas/ticket-admin.schema'
import type { AdminTicketSummary } from '#shared/types/services'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Tickets', robots: 'noindex, nofollow' })
type PageData = { items: AdminTicketSummary[]; pagination: { total: number; totalPages: number } }
type Options = {
  users: Array<{ id: string; firstName: string; lastName: string }>
  services: Array<{ id: string; name: string }>
}
const search = ref('')
const statusFilter = ref('')
const priority = ref('')
const service = ref('')
const assignedUser = ref('')
const page = ref(1)
const query = computed(() => ({
  page: page.value,
  pageSize: 20,
  search: search.value || undefined,
  status: statusFilter.value || undefined,
  priority: priority.value || undefined,
  service: service.value || undefined,
  assignedUser: assignedUser.value || undefined
}))
const [{ data, status: loading, error }, { data: options }] = await Promise.all([
  useFetch<{ success: true; data: PageData }>('/api/admin/tickets', {
    query,
    key: 'admin:tickets:list'
  }),
  useFetch<{ success: true; data: Options }>('/api/admin/tickets/options')
])
const statusLabels: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_REVIEW: 'En revisión',
  WAITING_CUSTOMER: 'Esperando cliente',
  QUOTED: 'Cotizado',
  APPROVED: 'Aprobado',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado'
}
const priorityLabels: Record<string, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente'
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Tickets de servicio"
      description="Seguimiento de solicitudes, asignación y estados."
    />
    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Código, cliente o asunto" /><select
        v-model="statusFilter"
        class="rounded-md border border-default bg-default px-3"
      >
        <option value="">Todos los estados</option>
        <option v-for="item in ticketStatuses" :key="item" :value="item">
          {{ statusLabels[item] }}
        </option></select
      ><select v-model="priority" class="rounded-md border border-default bg-default px-3">
        <option value="">Todas las prioridades</option>
        <option v-for="item in ticketPriorities" :key="item" :value="item">
          {{ priorityLabels[item] }}
        </option></select
      ><select v-model="service" class="rounded-md border border-default bg-default px-3">
        <option value="">Todos los servicios</option>
        <option v-for="item in options?.data.services" :key="item.id" :value="item.id">
          {{ item.name }}
        </option></select
      ><select v-model="assignedUser" class="rounded-md border border-default bg-default px-3">
        <option value="">Todos los responsables</option>
        <option v-for="item in options?.data.users" :key="item.id" :value="item.id">
          {{ item.firstName }} {{ item.lastName }}
        </option>
      </select>
    </div>
    <UAlert v-if="error" color="error" title="No se pudieron cargar los tickets" /><UCard
      class="overflow-x-auto bg-default ring-default"
      ><div v-if="loading === 'pending'" class="space-y-3">
        <USkeleton v-for="i in 6" :key="i" class="h-10" />
      </div>
      <table v-else class="w-full min-w-220 text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th class="p-3">Ticket</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Responsable</th>
            <th>Fecha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data.items" :key="item.id" class="border-t border-default">
            <td class="p-3">
              <strong class="font-mono text-primary">{{ item.ticketCode }}</strong>
              <div class="max-w-60 truncate text-xs text-muted">{{ item.subject }}</div>
            </td>
            <td>{{ item.customer }}</td>
            <td>{{ item.service }}</td>
            <td><UBadge :label="statusLabels[item.status]" variant="soft" /></td>
            <td>
              <UBadge
                :label="priorityLabels[item.priority]"
                :color="
                  item.priority === 'URGENT' ? 'error' : item.priority === 'HIGH' ? 'warning' : 'neutral'
                "
                variant="soft"
              />
            </td>
            <td>{{ item.assignedTo || 'Sin asignar' }}</td>
            <td>{{ new Date(item.createdAt).toLocaleString('es-EC') }}</td>
            <td><UButton :to="`/admin/tickets/${item.id}`" label="Abrir" variant="ghost" /></td>
          </tr>
        </tbody>
      </table>
      <UEmpty v-if="loading !== 'pending' && !data?.data.items.length" title="Sin tickets" /></UCard
    ><UPagination
      v-if="data?.data.pagination.totalPages"
      v-model:page="page"
      :total="data.data.pagination.total"
      :items-per-page="20"
      class="mt-4"
    />
  </div>
</template>
