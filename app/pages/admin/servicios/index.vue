<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Servicios', robots: 'noindex, nofollow' })
type Row = {
  id: string
  serviceCode: string
  name: string
  slug: string
  priceMode: string
  price: string | null
  active: boolean
  category: { name: string }
  _count: { fields: number; tickets: number }
}
type PageData = { items: Row[]; pagination: { total: number; totalPages: number } }
const search = ref('')
const page = ref(1)
const toast = useToast()
const confirmOpen = ref(false)
const selected = ref<Row | null>(null)
const saving = ref(false)
const { data, status, error, refresh } = await useFetch<{ success: true; data: PageData }>(
  '/api/admin/services',
  { query: computed(() => ({ page: page.value, pageSize: 20, search: search.value })) }
)
function confirmRemove(item: Row) {
  selected.value = item
  confirmOpen.value = true
}
async function remove() {
  if (!selected.value) return
  saving.value = true
  try {
    await $fetch(`/api/admin/services/${selected.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Servicio desactivado', color: 'success' })
    confirmOpen.value = false
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo eliminar', description: String(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="Servicios" description="Catálogo, precios y formularios de solicitud."
      ><UButton to="/admin/servicios/categorias" label="Categorías" color="neutral" variant="soft" /><UButton
        to="/admin/servicios/nuevo"
        label="Nuevo servicio"
        icon="i-lucide-plus" /></AdminPageHeader
    ><UInput
      v-model="search"
      class="mb-4 max-w-md"
      icon="i-lucide-search"
      placeholder="Buscar por código o nombre"
    /><UAlert v-if="error" color="error" title="No se pudieron cargar los servicios" /><UCard
      class="overflow-x-auto bg-slate-900/70 ring-white/10"
      ><div v-if="status === 'pending'" class="space-y-3">
        <USkeleton v-for="i in 5" :key="i" class="h-10" />
      </div>
      <table v-else class="w-full min-w-180 text-sm">
        <thead class="text-left text-slate-400">
          <tr>
            <th class="p-3">Código</th>
            <th>Servicio</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Tickets</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data.items" :key="item.id" class="border-t border-white/10">
            <td class="p-3 font-mono">{{ item.serviceCode }}</td>
            <td>
              <strong>{{ item.name }}</strong>
              <div class="text-xs text-slate-500">{{ item._count.fields }} campos</div>
            </td>
            <td>{{ item.category.name }}</td>
            <td>
              {{
                item.priceMode === 'QUOTE'
                  ? 'Cotización'
                  : `${item.priceMode === 'FROM' ? 'Desde ' : ''}$${item.price}`
              }}
            </td>
            <td>{{ item._count.tickets }}</td>
            <td><AdminStatusBadge :active="item.active" /></td>
            <td class="text-right">
              <UButton
                :to="`/admin/servicios/${item.id}`"
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
              /><UButton icon="i-lucide-trash-2" variant="ghost" color="error" @click="confirmRemove(item)" />
            </td>
          </tr>
        </tbody>
      </table>
      <UEmpty v-if="status !== 'pending' && !data?.data.items.length" title="Sin servicios" /></UCard
    ><UPagination
      v-if="data?.data.pagination.totalPages"
      v-model:page="page"
      :total="data.data.pagination.total"
      :items-per-page="20"
      class="mt-4"
    /><AdminConfirmDialog
      :open="confirmOpen"
      title="¿Desactivar servicio?"
      description="Se ocultará del portal público sin perder sus tickets históricos."
      :loading="saving"
      @close="confirmOpen = false"
      @confirm="remove"
    />
  </div>
</template>
