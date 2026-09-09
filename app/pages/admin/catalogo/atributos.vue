<script setup lang="ts">
const adminRequest = useAdminRequest()
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Atributos', robots: 'noindex, nofollow' })
type Option = { id?: string; value: string; label: string; sortOrder: number; active: boolean }
type Attribute = {
  id: string
  name: string
  slug: string
  type: string
  unit?: string | null
  filterable: boolean
  variant: boolean
  active: boolean
  sortOrder: number
  options: Option[]
  categories: Array<{ categoryId: string; required: boolean; sortOrder: number; category?: { name: string } }>
}
type Category = { id: string; name: string }
type PageData = { items: Attribute[]; pagination: { total: number; totalPages: number } }
const toast = useToast()
const search = ref('')
const page = ref(1)
const open = ref(false)
const confirmOpen = ref(false)
const saving = ref(false)
const selected = ref<Attribute | null>(null)
const types = ['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT']
const form = reactive({
  name: '',
  slug: '',
  type: 'TEXT',
  unit: '',
  filterable: false,
  variant: false,
  active: true,
  sortOrder: 0,
  optionLines: '',
  categoryIds: [] as string[],
  requiredCategoryIds: [] as string[]
})
const { data, status, error, refresh } = await useFetch<{ success: true; data: PageData }>(
  '/api/admin/attributes',
  { query: computed(() => ({ page: page.value, pageSize: 20, search: search.value })) }
)
const { data: categoriesData } = await useFetch<{ success: true; data: Category[] }>(
  '/api/admin/categories',
  { query: { tree: 'true' } }
)
function edit(item?: Attribute) {
  selected.value = item || null
  Object.assign(
    form,
    item
      ? {
          name: item.name,
          slug: item.slug,
          type: item.type,
          unit: item.unit || '',
          filterable: item.filterable,
          variant: item.variant,
          active: item.active,
          sortOrder: item.sortOrder,
          optionLines: item.options.map((option) => `${option.value}|${option.label}`).join('\n'),
          categoryIds: item.categories.map((category) => category.categoryId),
          requiredCategoryIds: item.categories
            .filter((category) => category.required)
            .map((category) => category.categoryId)
        }
      : {
          name: '',
          slug: '',
          type: 'TEXT',
          unit: '',
          filterable: false,
          variant: false,
          active: true,
          sortOrder: 0,
          optionLines: '',
          categoryIds: [],
          requiredCategoryIds: []
        }
  )
  open.value = true
}
function confirmRemove(item: Attribute) {
  selected.value = item
  confirmOpen.value = true
}
function optionsPayload() {
  const existing = new Map(selected.value?.options.map((option) => [option.value, option]) || [])
  return form.optionLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawValue, label] = line.split('|').map((part) => part.trim())
      const value = rawValue || ''
      const old = existing.get(value)
      return { id: old?.id, value, label: label || value, sortOrder: index, active: true }
    })
}
async function save() {
  saving.value = true
  try {
    const body = {
      name: form.name,
      slug: form.slug || undefined,
      type: form.type,
      unit: form.unit || null,
      filterable: form.filterable,
      variant: form.variant,
      active: form.active,
      sortOrder: form.sortOrder,
      options: ['SELECT', 'MULTISELECT'].includes(form.type) ? optionsPayload() : [],
      categories: form.categoryIds.map((categoryId, index) => ({
        categoryId,
        required: form.requiredCategoryIds.includes(categoryId),
        sortOrder: index
      }))
    }
    await adminRequest(
      selected.value ? `/api/admin/attributes/${selected.value.id}` : '/api/admin/attributes',
      {
        method: selected.value ? 'PUT' : 'POST',
        body
      }
    )
    toast.add({ title: selected.value ? 'Atributo actualizado' : 'Atributo creado', color: 'success' })
    open.value = false
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo guardar el atributo', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
async function remove() {
  if (!selected.value) return
  saving.value = true
  try {
    await adminRequest(`/api/admin/attributes/${selected.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Atributo desactivado', color: 'success' })
    confirmOpen.value = false
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo desactivar', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Atributos"
      description="Especificaciones relacionales reutilizables por categoría."
    >
      <UButton label="Nuevo atributo" icon="i-lucide-plus" @click="edit()" /> </AdminPageHeader
    ><UInput
      v-model="search"
      placeholder="Buscar atributo"
      icon="i-lucide-search"
      class="mb-4 max-w-md"
    /><UAlert v-if="error" color="error" title="No se pudieron cargar los atributos" /><UCard
      class="overflow-x-auto bg-default ring-default"
    >
      <div v-if="status === 'pending'" class="space-y-3">
        <USkeleton v-for="index in 4" :key="index" class="h-10" />
      </div>
      <table v-else class="w-full min-w-180 text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th class="p-3">Atributo</th>
            <th>Tipo</th>
            <th>Opciones</th>
            <th>Categorías</th>
            <th>Uso</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data.items" :key="item.id" class="border-t border-default">
            <td class="p-3 font-medium">
              {{ item.name }}
              <div class="text-xs text-muted">{{ item.slug }} {{ item.unit || '' }}</div>
            </td>
            <td>{{ item.type }}</td>
            <td>{{ item.options.length }}</td>
            <td>{{ item.categories.map((category) => category.category?.name).join(', ') || '—' }}</td>
            <td>
              <UBadge v-if="item.variant" variant="soft">Variante</UBadge
              ><UBadge v-if="item.filterable" color="neutral" variant="soft" class="ml-1">Filtro</UBadge>
            </td>
            <td><AdminStatusBadge :active="item.active" /></td>
            <td class="text-right">
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
                aria-label="Editar"
                @click="edit(item)"
              /><UButton
                icon="i-lucide-power"
                variant="ghost"
                color="error"
                aria-label="Desactivar"
                @click="confirmRemove(item)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <UEmpty v-if="status !== 'pending' && !data?.data.items.length" title="Sin atributos" /> </UCard
    ><UPagination
      v-if="data?.data.pagination.totalPages"
      v-model:page="page"
      :total="data.data.pagination.total"
      :items-per-page="20"
      class="mt-4"
    />
    <AdminFormDialog v-model:open="open" title="Datos del registro">
      <UCard class="mx-auto my-8 w-full max-w-3xl bg-default ring-default">
        <h2 class="text-xl font-bold">{{ selected ? 'Editar atributo' : 'Nuevo atributo' }}</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Nombre" required><UInput v-model="form.name" class="w-full" /></UFormField
          ><UFormField label="Slug">
            <UInput v-model="form.slug" class="w-full" placeholder="Automático" /> </UFormField
          ><UFormField label="Tipo" required>
            <select v-model="form.type" class="w-full rounded-md border border-default bg-default p-2">
              <option v-for="type in types" :key="type">{{ adminLabel(type) }}</option>
            </select> </UFormField
          ><UFormField label="Unidad">
            <UInput v-model="form.unit" class="w-full" placeholder="GB, pulgadas, GHz..." /> </UFormField
          ><UFormField label="Categorías">
            <select
              v-model="form.categoryIds"
              multiple
              class="h-32 w-full rounded-md border border-default bg-default p-2"
            >
              <option v-for="category in categoriesData?.data" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select> </UFormField
          ><UFormField label="Requerido en">
            <select
              v-model="form.requiredCategoryIds"
              multiple
              class="h-32 w-full rounded-md border border-default bg-default p-2"
            >
              <option
                v-for="category in categoriesData?.data.filter((item) => form.categoryIds.includes(item.id))"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select> </UFormField
          ><UFormField
            v-if="['SELECT', 'MULTISELECT'].includes(form.type)"
            label="Opciones (valor|etiqueta por línea)"
            class="sm:col-span-2"
          >
            <UTextarea
              v-model="form.optionLines"
              :rows="6"
              class="w-full"
              placeholder="black|Negro\nwhite|Blanco"
            />
          </UFormField>
          <div class="flex flex-wrap gap-5 sm:col-span-2">
            <UCheckbox v-model="form.filterable" label="Filtrable" /><UCheckbox
              v-model="form.variant"
              label="Genera variantes"
            /><UCheckbox v-model="form.active" label="Activo" />
          </div>
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
      title="¿Desactivar atributo?"
      description="Los valores históricos se conservan."
      :loading="saving"
      @close="confirmOpen = false"
      @confirm="remove"
    />
  </div>
</template>
