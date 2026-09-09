<script setup lang="ts">
const adminRequest = useAdminRequest()
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Marcas', robots: 'noindex, nofollow' })
type Brand = {
  id: string
  name: string
  slug: string
  description?: string | null
  logoUrl?: string | null
  websiteUrl?: string | null
  active: boolean
  _count?: { products: number }
}
type PageData = { items: Brand[]; pagination: { total: number; totalPages: number } }
const toast = useToast()
const search = ref('')
const page = ref(1)
const open = ref(false)
const confirmOpen = ref(false)
const saving = ref(false)
const selected = ref<Brand | null>(null)
const form = reactive({ name: '', slug: '', description: '', logoUrl: '', websiteUrl: '', active: true })
const { data, status, error, refresh } = await useFetch<{ success: true; data: PageData }>(
  '/api/admin/brands',
  { query: computed(() => ({ page: page.value, pageSize: 20, search: search.value })) }
)
function edit(item?: Brand) {
  selected.value = item || null
  Object.assign(
    form,
    item
      ? {
          name: item.name,
          slug: item.slug,
          description: item.description || '',
          logoUrl: item.logoUrl || '',
          websiteUrl: item.websiteUrl || '',
          active: item.active
        }
      : { name: '', slug: '', description: '', logoUrl: '', websiteUrl: '', active: true }
  )
  open.value = true
}
function confirmRemove(item: Brand) {
  selected.value = item
  confirmOpen.value = true
}
async function save() {
  saving.value = true
  try {
    await adminRequest(selected.value ? `/api/admin/brands/${selected.value.id}` : '/api/admin/brands', {
      method: selected.value ? 'PUT' : 'POST',
      body: {
        ...form,
        slug: form.slug || undefined,
        logoUrl: form.logoUrl || null,
        websiteUrl: form.websiteUrl || null
      }
    })
    toast.add({ title: selected.value ? 'Marca actualizada' : 'Marca creada', color: 'success' })
    open.value = false
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo guardar la marca', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
async function remove() {
  if (!selected.value) return
  saving.value = true
  try {
    await adminRequest(`/api/admin/brands/${selected.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Marca eliminada', color: 'success' })
    confirmOpen.value = false
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo eliminar la marca', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="Marcas" description="Identidad comercial y asociación con productos.">
      <UButton label="Nueva marca" icon="i-lucide-plus" @click="edit()" /> </AdminPageHeader
    ><UInput
      v-model="search"
      placeholder="Buscar marca"
      icon="i-lucide-search"
      class="mb-4 max-w-md"
    /><UAlert v-if="error" color="error" title="No se pudieron cargar las marcas" /><UCard
      class="overflow-x-auto bg-default ring-default"
    >
      <div v-if="status === 'pending'" class="space-y-3">
        <USkeleton v-for="index in 4" :key="index" class="h-10" />
      </div>
      <table v-else class="w-full min-w-150 text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th class="p-3">Marca</th>
            <th>Productos</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data.items" :key="item.id" class="border-t border-default">
            <td class="p-3 font-medium">
              {{ item.name }}
              <div class="text-xs text-muted">{{ item.slug }}</div>
            </td>
            <td>{{ item._count?.products || 0 }}</td>
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
      <UEmpty v-if="status !== 'pending' && !data?.data.items.length" title="Sin marcas" /> </UCard
    ><UPagination
      v-if="data?.data.pagination.totalPages"
      v-model:page="page"
      :total="data.data.pagination.total"
      :items-per-page="20"
      class="mt-4"
    />
    <AdminFormDialog v-model:open="open" title="Datos del registro">
      <UCard class="w-full max-w-xl bg-default ring-default">
        <h2 class="text-xl font-bold">{{ selected ? 'Editar marca' : 'Nueva marca' }}</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Nombre" required><UInput v-model="form.name" class="w-full" /></UFormField
          ><UFormField label="Slug">
            <UInput v-model="form.slug" class="w-full" placeholder="Automático" /> </UFormField
          ><UFormField label="Logo URL"><UInput v-model="form.logoUrl" class="w-full" /></UFormField
          ><UFormField label="Sitio web"><UInput v-model="form.websiteUrl" class="w-full" /></UFormField
          ><UFormField label="Descripción" class="sm:col-span-2">
            <UTextarea v-model="form.description" class="w-full" /> </UFormField
          ><UCheckbox v-model="form.active" label="Activa" />
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="ghost" @click="open = false" /><UButton
            label="Guardar"
            :loading="saving"
            @click="save"
          />
        </div> </UCard
    ></AdminFormDialog>
    <AdminConfirmDialog
      :open="confirmOpen"
      title="¿Eliminar marca?"
      description="La marca quedará desactivada; sus productos se conservan."
      :loading="saving"
      @close="confirmOpen = false"
      @confirm="remove"
    />
  </div>
</template>
