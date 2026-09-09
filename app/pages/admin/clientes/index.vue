<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Clientes', robots: 'noindex, nofollow' })
type Customer = {
  id: string
  customerCode: string
  firstName: string
  lastName: string
  documentType: string | null
  documentNumber: string | null
  email: string | null
  whatsapp: string | null
  active: boolean
  updatedAt: string
  _count: { orders: number; tickets: number }
}
const search = ref('')
const page = ref(1)
const { data, status, error } = await useFetch<{
  success: true
  data: { items: Customer[]; pagination: { total: number; totalPages: number } }
}>('/api/admin/customers', {
  query: computed(() => ({ page: page.value, pageSize: 20, search: search.value || undefined }))
})
</script>

<template>
  <div>
    <AdminPageHeader title="Clientes" description="Historial operativo consolidado de pedidos y tickets." />
    <UInput
      v-model="search"
      aria-label="Buscar clientes"
      placeholder="Código, nombre, documento, email o WhatsApp"
      icon="i-lucide-search"
      class="mb-4 max-w-xl"
    />
    <UAlert v-if="error" color="error" title="No se pudieron cargar los clientes" />
    <UCard class="overflow-x-auto bg-default ring-default"
      ><USkeleton v-if="status === 'pending'" class="h-52" />
      <table v-else class="w-full min-w-220 text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th class="p-3">Código</th>
            <th>Nombre</th>
            <th>Documento</th>
            <th>Email</th>
            <th>WhatsApp</th>
            <th>Pedidos</th>
            <th>Tickets</th>
            <th>Última actividad</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data.items" :key="item.id" class="border-t border-default">
            <td class="p-3 font-mono text-primary">{{ item.customerCode }}</td>
            <td>{{ item.firstName }} {{ item.lastName }}</td>
            <td>{{ item.documentNumber || '—' }}</td>
            <td>{{ item.email || '—' }}</td>
            <td>{{ item.whatsapp || '—' }}</td>
            <td>{{ item._count.orders }}</td>
            <td>{{ item._count.tickets }}</td>
            <td>{{ new Date(item.updatedAt).toLocaleString('es-EC') }}</td>
            <td><AdminStatusBadge :active="item.active" /></td>
            <td><UButton :to="`/admin/clientes/${item.id}`" label="Abrir" variant="ghost" /></td>
          </tr>
        </tbody>
      </table>
      <UEmpty v-if="status !== 'pending' && !data?.data.items.length" title="Sin clientes"
    /></UCard>
    <UPagination
      v-if="data?.data.pagination.totalPages"
      v-model:page="page"
      :total="data.data.pagination.total"
      :items-per-page="20"
      class="mt-4"
    />
  </div>
</template>
