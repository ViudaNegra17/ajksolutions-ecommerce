<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Categorías', robots: 'noindex, nofollow' })

type Category = {
  id: string
  name: string
  slug: string
  description?: string | null
  parentId?: string | null
  active: boolean
  sortOrder: number
  parent?: { name: string } | null
  _count?: { children: number; products: number }
}
type PageData = {
  items: Category[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}
const toast = useToast()
const search = ref('')
const page = ref(1)
const open = ref(false)
const confirmOpen = ref(false)
const saving = ref(false)
const selected = ref<Category | null>(null)
const form = reactive({ name: '', slug: '', description: '', parentId: '', active: true, sortOrder: 0 })
const query = computed(() => ({ page: page.value, pageSize: 20, search: search.value }))
const { data, status, error, refresh } = await useFetch<{ success: true; data: PageData }>(
  '/api/admin/categories',
  { query }
)
const { data: treeData, refresh: refreshTree } = await useFetch<{ success: true; data: Category[] }>(
  '/api/admin/categories',
  { query: { tree: 'true' } }
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
          parentId: item.parentId || '',
          active: item.active,
          sortOrder: item.sortOrder
        }
      : { name: '', slug: '', description: '', parentId: '', active: true, sortOrder: 0 }
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
    const body = { ...form, slug: form.slug || undefined, parentId: form.parentId || null }
    await $fetch(selected.value ? `/api/admin/categories/${selected.value.id}` : '/api/admin/categories', {
      method: selected.value ? 'PUT' : 'POST',
      body
    })
    toast.add({ title: selected.value ? 'Categoría actualizada' : 'Categoría creada', color: 'success' })
    open.value = false
    await Promise.all([refresh(), refreshTree()])
  } catch (cause) {
    toast.add({ title: 'No se pudo guardar la categoría', description: String(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!selected.value) return
  saving.value = true
  try {
    await $fetch(`/api/admin/categories/${selected.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Categoría eliminada', color: 'success' })
    confirmOpen.value = false
    await Promise.all([refresh(), refreshTree()])
  } catch (cause) {
    toast.add({ title: 'No se pudo eliminar la categoría', description: String(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="Categorías" description="Jerarquía sin límite artificial de niveles.">
      <UButton label="Nueva categoría" icon="i-lucide-plus" @click="edit()" />
    </AdminPageHeader>
    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Buscar categoría"
      class="mb-4 max-w-md"
      @update:model-value="page = 1"
    />
    <UAlert v-if="error" color="error" title="No se pudieron cargar las categorías" />
    <UCard class="overflow-x-auto bg-slate-900/70 ring-white/10">
      <div v-if="status === 'pending'" class="space-y-3">
        <USkeleton v-for="index in 4" :key="index" class="h-10" />
      </div>
      <table v-else class="w-full min-w-180 text-sm">
        <thead class="text-left text-slate-400">
          <tr>
            <th class="p-3">Nombre</th>
            <th>Padre</th>
            <th>Orden</th>
            <th>Uso</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data.items" :key="item.id" class="border-t border-white/10">
            <td class="p-3 font-medium">
              {{ item.name }}
              <div class="text-xs text-slate-500">{{ item.slug }}</div>
            </td>
            <td>{{ item.parent?.name || 'Raíz' }}</td>
            <td>{{ item.sortOrder }}</td>
            <td>{{ item._count?.children }} sub / {{ item._count?.products }} prod.</td>
            <td><AdminStatusBadge :active="item.active" /></td>
            <td class="text-right">
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                aria-label="Editar"
                @click="edit(item)"
              /><UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                aria-label="Eliminar"
                @click="confirmRemove(item)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <UEmpty
        v-if="status !== 'pending' && !data?.data.items.length"
        title="Sin categorías"
        description="Crea la primera categoría del catálogo."
      />
    </UCard>
    <UPagination
      v-if="data?.data.pagination.totalPages"
      v-model:page="page"
      :total="data.data.pagination.total"
      :items-per-page="20"
      class="mt-4"
    />

    <div
      v-if="open"
      class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <UCard class="w-full max-w-xl bg-slate-900 ring-white/10">
        <h2 class="text-xl font-bold">{{ selected ? 'Editar categoría' : 'Nueva categoría' }}</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Nombre" required><UInput v-model="form.name" class="w-full" /></UFormField
          ><UFormField label="Slug">
            <UInput v-model="form.slug" class="w-full" placeholder="Automático" /> </UFormField
          ><UFormField label="Categoría padre">
            <select v-model="form.parentId" class="w-full rounded-md border border-white/10 bg-slate-950 p-2">
              <option value="">Raíz</option>
              <option
                v-for="item in treeData?.data.filter((category) => category.id !== selected?.id)"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option>
            </select> </UFormField
          ><UFormField label="Orden">
            <UInput v-model.number="form.sortOrder" type="number" min="0" class="w-full" /> </UFormField
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
        </div>
      </UCard>
    </div>
    <AdminConfirmDialog
      :open="confirmOpen"
      title="¿Eliminar categoría?"
      description="Se realizará una eliminación lógica. Esta acción requiere confirmación."
      :loading="saving"
      @close="confirmOpen = false"
      @confirm="remove"
    />
  </div>
</template>
