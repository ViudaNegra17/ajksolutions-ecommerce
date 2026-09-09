<script setup lang="ts">
const adminRequest = useAdminRequest()
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Promociones', robots: 'noindex, nofollow' })
type Promotion = {
  id: string
  code: string
  name: string
  description: string | null
  badge: string
  type: 'INFORMATIONAL'
  startsAt: string | null
  endsAt: string | null
  active: boolean
  priority: number
  products: Array<{ productId: string }>
  categories: Array<{ categoryId: string }>
}
type Option = { id: string; name: string }
const toast = useToast()
const open = ref(false)
const saving = ref(false)
const removal = ref<Promotion | null>(null)
const selected = ref<Promotion | null>(null)
const form = reactive({
  name: '',
  description: '',
  badge: 'Oferta',
  type: 'INFORMATIONAL' as const,
  startsAt: '',
  endsAt: '',
  active: false,
  priority: 0,
  productIds: [] as string[],
  categoryIds: [] as string[]
})
const [{ data, status, error, refresh }, { data: optionData }] = await Promise.all([
  useFetch<{ success: true; data: Promotion[] }>('/api/admin/promotions'),
  useFetch<{ success: true; data: { products: Option[]; categories: Option[] } }>(
    '/api/admin/promotions/options'
  )
])
function edit(item?: Promotion) {
  selected.value = item || null
  Object.assign(
    form,
    item
      ? {
          ...item,
          description: item.description || '',
          startsAt: localDateInput(item.startsAt),
          endsAt: localDateInput(item.endsAt),
          productIds: item.products.map((row) => row.productId),
          categoryIds: item.categories.map((row) => row.categoryId)
        }
      : {
          name: '',
          description: '',
          badge: 'Oferta',
          type: 'INFORMATIONAL',
          startsAt: '',
          endsAt: '',
          active: false,
          priority: 0,
          productIds: [],
          categoryIds: []
        }
  )
  open.value = true
}
function toggle(list: string[], id: string) {
  const index = list.indexOf(id)
  if (index < 0) list.push(id)
  else list.splice(index, 1)
}
async function save() {
  saving.value = true
  try {
    await adminRequest(
      selected.value ? `/api/admin/promotions/${selected.value.id}` : '/api/admin/promotions',
      {
        method: selected.value ? 'PUT' : 'POST',
        body: {
          ...form,
          description: form.description || null,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null
        }
      }
    )
    toast.add({ title: selected.value ? 'Promoción actualizada' : 'Promoción creada', color: 'success' })
    open.value = false
    await refresh()
  } catch (cause) {
    toast.add({
      title: 'No se pudo guardar la promoción',
      description: uiErrorMessage(cause),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
async function remove() {
  if (!removal.value || saving.value) return
  saving.value = true
  try {
    await adminRequest(`/api/admin/promotions/${removal.value.id}`, { method: 'DELETE' })
    removal.value = null
    await refresh()
    toast.add({ title: 'Promoción eliminada', color: 'success' })
  } catch (cause) {
    toast.add({ title: 'No se pudo eliminar', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminConfirmDialog
      :open="Boolean(removal)"
      title="¿Eliminar promoción?"
      description="Se retirará el contenido promocional de la tienda."
      :loading="saving"
      @close="removal = null"
      @confirm="remove"
    />
    <AdminPageHeader
      title="Promociones"
      description="Mensajes comerciales informativos; nunca modifican el precio del checkout."
    >
      <UButton label="Nueva promoción" icon="i-lucide-plus" @click="edit()" />
    </AdminPageHeader>
    <UAlert v-if="error" color="error" title="No se pudieron cargar las promociones" />
    <UCard class="overflow-x-auto bg-default ring-default"
      ><USkeleton v-if="status === 'pending'" class="h-48" />
      <table v-else class="w-full min-w-180 text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th class="p-3">Nombre</th>
            <th>Tipo</th>
            <th>Targets</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data" :key="item.id" class="border-t border-default">
            <td class="p-3">
              <span class="font-medium">{{ item.name }}</span
              ><br /><UBadge :label="item.badge" color="warning" variant="soft" />
            </td>
            <td>Informativa</td>
            <td>{{ item.products.length }} productos · {{ item.categories.length }} categorías</td>
            <td>{{ item.startsAt ? new Date(item.startsAt).toLocaleDateString('es-EC') : 'Inmediato' }}</td>
            <td>{{ item.endsAt ? new Date(item.endsAt).toLocaleDateString('es-EC') : 'Sin fin' }}</td>
            <td><AdminStatusBadge :active="item.active" /></td>
            <td>{{ item.priority }}</td>
            <td>
              <UButton
                icon="i-lucide-pencil"
                aria-label="Editar"
                variant="ghost"
                @click="edit(item)"
              /><UButton
                icon="i-lucide-trash-2"
                aria-label="Eliminar"
                color="error"
                variant="ghost"
                @click="removal = item"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <UEmpty v-if="status !== 'pending' && !data?.data.length" title="Sin promociones"
    /></UCard>
    <AdminFormDialog v-model:open="open" title="Datos del registro">
      <UCard class="my-8 w-full max-w-4xl bg-default ring-default">
        <h2 class="text-xl font-bold">{{ selected ? 'Editar promoción' : 'Nueva promoción' }}</h2>
        <UAlert
          class="mt-4"
          color="info"
          title="Promoción informativa"
          description="El badge comunica una campaña; Product.price y Order.total no cambian."
        />
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Nombre" required><UInput v-model="form.name" class="w-full" /></UFormField
          ><UFormField label="Badge" required><UInput v-model="form.badge" class="w-full" /></UFormField
          ><UFormField label="Inicio"
            ><UInput v-model="form.startsAt" type="datetime-local" class="w-full" /></UFormField
          ><UFormField label="Fin"
            ><UInput v-model="form.endsAt" type="datetime-local" class="w-full" /></UFormField
          ><UFormField label="Prioridad"
            ><UInput v-model.number="form.priority" type="number" min="0" class="w-full" /></UFormField
          ><UCheckbox v-model="form.active" label="Activa" /><UFormField
            label="Descripción"
            class="sm:col-span-2"
            ><UTextarea v-model="form.description" class="w-full"
          /></UFormField>
        </div>
        <div class="mt-5 grid gap-5 md:grid-cols-2">
          <fieldset>
            <legend class="font-bold">Productos</legend>
            <div class="mt-2 max-h-48 space-y-2 overflow-auto rounded-xl border border-default p-3">
              <UCheckbox
                v-for="item in optionData?.data.products"
                :key="item.id"
                :model-value="form.productIds.includes(item.id)"
                :label="item.name"
                @update:model-value="toggle(form.productIds, item.id)"
              />
            </div>
          </fieldset>
          <fieldset>
            <legend class="font-bold">Categorías</legend>
            <div class="mt-2 max-h-48 space-y-2 overflow-auto rounded-xl border border-default p-3">
              <UCheckbox
                v-for="item in optionData?.data.categories"
                :key="item.id"
                :model-value="form.categoryIds.includes(item.id)"
                :label="item.name"
                @update:model-value="toggle(form.categoryIds, item.id)"
              />
            </div>
          </fieldset>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="ghost" @click="open = false" /><UButton
            label="Guardar"
            :loading="saving"
            @click="save"
          />
        </div> </UCard
    ></AdminFormDialog>
  </div>
</template>
