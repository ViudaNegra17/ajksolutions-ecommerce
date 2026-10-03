<script setup lang="ts">
const adminRequest = useAdminRequest()
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Categorías de servicio', robots: 'noindex, nofollow' })
type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  parentId: string | null
  active: boolean
  sortOrder: number
  parent?: { name: string } | null
  _count: { children: number; services: number }
}
const toast = useToast()
const open = ref(false)
const confirmOpen = ref(false)
const saving = ref(false)
const selected = ref<Category | null>(null)
const form = reactive({
  name: '',
  slug: '',
  description: '',
  icon: '',
  parentId: '',
  active: true,
  sortOrder: 0
})
const { data, error, refresh } = await useFetch<{ success: true; data: Category[] }>(
  '/api/admin/service-categories'
)
function edit(item?: Category) {
  selected.value = item || null
  Object.assign(
    form,
    item
      ? {
          name: item.name,
          slug: item.slug,
          description: item.description || '',
          icon: item.icon || '',
          parentId: item.parentId || '',
          active: item.active,
          sortOrder: item.sortOrder
        }
      : { name: '', slug: '', description: '', icon: '', parentId: '', active: true, sortOrder: 0 }
  )
  open.value = true
}
function confirmRemove(item: Category) {
  selected.value = item
  confirmOpen.value = true
}
async function save() {
  saving.value = true
  try {
    await adminRequest(
      selected.value ? `/api/admin/service-categories/${selected.value.id}` : '/api/admin/service-categories',
      {
        method: selected.value ? 'PUT' : 'POST',
        body: {
          ...form,
          slug: undefined,
          description: form.description || null,
          icon: form.icon || null,
          parentId: form.parentId || null,
          imageUrl: null
        }
      }
    )
    toast.add({ title: selected.value ? 'Categoría actualizada' : 'Categoría creada', color: 'success' })
    open.value = false
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo guardar', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
async function remove() {
  if (!selected.value) return
  saving.value = true
  try {
    await adminRequest(`/api/admin/service-categories/${selected.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Categoría eliminada', color: 'success' })
    confirmOpen.value = false
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo eliminar', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Categorías de servicio"
      description="Organiza la navegación pública y la clasificación interna."
      ><UButton to="/admin/servicios" label="Servicios" color="neutral" variant="soft" /><UButton
        label="Nueva categoría"
        icon="i-lucide-plus"
        @click="edit()" /></AdminPageHeader
    ><UAlert v-if="error" color="error" title="No se pudieron cargar las categorías" /><UCard
      class="overflow-x-auto bg-default ring-default"
      ><table class="admin-table w-full min-w-150 text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th class="p-3">Categoría</th>
            <th>Padre</th>
            <th>Servicios</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data" :key="item.id" class="border-t border-default">
            <td class="p-3">
              <strong>{{ item.name }}</strong>
            </td>
            <td>{{ item.parent?.name || '—' }}</td>
            <td>{{ item._count.services }}</td>
            <td><AdminStatusBadge :active="item.active" /></td>
            <td class="text-right">
              <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" @click="edit(item)" /><UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                @click="confirmRemove(item)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <UEmpty v-if="!data?.data.length" title="Sin categorías"
    /></UCard>
    <AdminFormDialog v-model:open="open" title="Datos del registro">
      <UCard class="w-full max-w-xl bg-default ring-default"
        ><h2 class="text-xl font-bold">{{ selected ? 'Editar categoría' : 'Nueva categoría' }}</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Nombre" required><UInput v-model="form.name" class="w-full" /></UFormField
          ><UFormField label="Categoría padre"
            ><select
              v-model="form.parentId"
              class="w-full rounded-md border border-default bg-default px-3 py-2"
            >
              <option value="">Sin padre</option>
              <option
                v-for="item in data?.data.filter((value) => value.id !== selected?.id)"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option>
            </select></UFormField
          ><UFormField label="Icono"><UInput v-model="form.icon" class="w-full" /></UFormField
          ><UFormField label="Descripción" class="sm:col-span-2"
            ><UTextarea v-model="form.description" class="w-full" /></UFormField
          ><UFormField label="Orden"><UInput v-model.number="form.sortOrder" type="number" /></UFormField
          ><UCheckbox v-model="form.active" label="Activa" />
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="ghost" @click="open = false" /><UButton
            label="Guardar"
            :loading="saving"
            @click="save"
          /></div></UCard
    ></AdminFormDialog>
    <AdminConfirmDialog
      :open="confirmOpen"
      title="¿Eliminar categoría?"
      description="No se puede eliminar mientras tenga subcategorías."
      :loading="saving"
      @close="confirmOpen = false"
      @confirm="remove"
    />
  </div>
</template>
