<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Proveedores', robots: 'noindex, nofollow' })
type Supplier = {
  id: string
  supplierCode: string
  name: string
  legalName?: string | null
  taxId?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  website?: string | null
  contactName?: string | null
  notes?: string | null
  active: boolean
  _count?: { supplierProducts: number }
}
type PageData = { items: Supplier[]; pagination: { total: number; totalPages: number } }
const toast = useToast()
const search = ref('')
const page = ref(1)
const open = ref(false)
const confirmOpen = ref(false)
const saving = ref(false)
const selected = ref<Supplier | null>(null)
const emptyForm = () => ({
  name: '',
  legalName: '',
  taxId: '',
  email: '',
  phone: '',
  whatsapp: '',
  website: '',
  contactName: '',
  notes: '',
  active: true
})
const form = reactive(emptyForm())
const { data, status, error, refresh } = await useFetch<{ success: true; data: PageData }>(
  '/api/admin/suppliers',
  { query: computed(() => ({ page: page.value, pageSize: 20, search: search.value })) }
)
function edit(item?: Supplier) {
  selected.value = item || null
  Object.assign(
    form,
    item
      ? {
          name: item.name,
          legalName: item.legalName || '',
          taxId: item.taxId || '',
          email: item.email || '',
          phone: item.phone || '',
          whatsapp: item.whatsapp || '',
          website: item.website || '',
          contactName: item.contactName || '',
          notes: item.notes || '',
          active: item.active
        }
      : emptyForm()
  )
  open.value = true
}
function confirmRemove(item: Supplier) {
  selected.value = item
  confirmOpen.value = true
}
async function save() {
  saving.value = true
  try {
    await $fetch(selected.value ? `/api/admin/suppliers/${selected.value.id}` : '/api/admin/suppliers', {
      method: selected.value ? 'PUT' : 'POST',
      body: form
    })
    toast.add({ title: selected.value ? 'Proveedor actualizado' : 'Proveedor creado', color: 'success' })
    open.value = false
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo guardar el proveedor', description: String(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
async function remove() {
  if (!selected.value) return
  saving.value = true
  try {
    await $fetch(`/api/admin/suppliers/${selected.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Proveedor eliminado', color: 'success' })
    confirmOpen.value = false
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo eliminar el proveedor', description: String(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Proveedores"
      description="Stock externo y costos permanecen separados del inventario propio."
    >
      <UButton label="Nuevo proveedor" icon="i-lucide-plus" @click="edit()" /> </AdminPageHeader
    ><UInput
      v-model="search"
      placeholder="Buscar código, nombre o identificación"
      icon="i-lucide-search"
      class="mb-4 max-w-lg"
    /><UAlert v-if="error" color="error" title="No se pudieron cargar los proveedores" /><UCard
      class="overflow-x-auto bg-slate-900/70 ring-white/10"
    >
      <div v-if="status === 'pending'" class="space-y-3">
        <USkeleton v-for="index in 4" :key="index" class="h-10" />
      </div>
      <table v-else class="w-full min-w-180 text-sm">
        <thead class="text-left text-slate-400">
          <tr>
            <th class="p-3">Código</th>
            <th>Proveedor</th>
            <th>Contacto</th>
            <th>Productos</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data.items" :key="item.id" class="border-t border-white/10">
            <td class="p-3 font-mono text-cyan-400">{{ item.supplierCode }}</td>
            <td class="font-medium">
              {{ item.name }}
              <div class="text-xs text-slate-500">{{ item.taxId || 'Sin identificación' }}</div>
            </td>
            <td>{{ item.contactName || item.email || item.phone || '—' }}</td>
            <td>{{ item._count?.supplierProducts || 0 }}</td>
            <td><AdminStatusBadge :active="item.active" /></td>
            <td class="text-right">
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
                aria-label="Editar"
                @click="edit(item)"
              /><UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                aria-label="Eliminar"
                @click="confirmRemove(item)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <UEmpty v-if="status !== 'pending' && !data?.data.items.length" title="Sin proveedores" /> </UCard
    ><UPagination
      v-if="data?.data.pagination.totalPages"
      v-model:page="page"
      :total="data.data.pagination.total"
      :items-per-page="20"
      class="mt-4"
    />
    <div
      v-if="open"
      class="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <UCard class="mx-auto my-8 w-full max-w-3xl bg-slate-900 ring-white/10">
        <h2 class="text-xl font-bold">
          {{ selected ? `Editar ${selected.supplierCode}` : 'Nuevo proveedor' }}
        </h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Nombre comercial" required>
            <UInput v-model="form.name" class="w-full" /> </UFormField
          ><UFormField label="Razón social"><UInput v-model="form.legalName" class="w-full" /></UFormField
          ><UFormField label="Identificación tributaria">
            <UInput v-model="form.taxId" class="w-full" /> </UFormField
          ><UFormField label="Contacto"><UInput v-model="form.contactName" class="w-full" /></UFormField
          ><UFormField label="Email"><UInput v-model="form.email" type="email" class="w-full" /></UFormField
          ><UFormField label="Teléfono"><UInput v-model="form.phone" class="w-full" /></UFormField
          ><UFormField label="WhatsApp"><UInput v-model="form.whatsapp" class="w-full" /></UFormField
          ><UFormField label="Sitio web"><UInput v-model="form.website" class="w-full" /></UFormField
          ><UFormField label="Notas" class="sm:col-span-2">
            <UTextarea v-model="form.notes" class="w-full" /> </UFormField
          ><UCheckbox v-model="form.active" label="Activo" />
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="ghost" @click="open = false" /><UButton
            label="Guardar"
            :loading="saving"
            @click="save"
          />
        </div>
      </UCard>
    </div>
    <AdminConfirmDialog
      :open="confirmOpen"
      title="¿Eliminar proveedor?"
      description="Se aplicará soft delete y sus relaciones históricas se conservarán."
      :loading="saving"
      @close="confirmOpen = false"
      @confirm="remove"
    />
  </div>
</template>
