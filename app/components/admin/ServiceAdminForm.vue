<script setup lang="ts">
type Category = { id: string; name: string }
type Option = { id?: string; value: string; label: string; sortOrder: number; active: boolean }
type Field = {
  id?: string
  key: string
  label: string
  description: string
  placeholder: string
  type: string
  required: boolean
  active: boolean
  sortOrder: number
  validationConfig: null
  options: Option[]
}
type ServiceData = Record<string, unknown> & { fields?: Array<Record<string, unknown>> }
const props = defineProps<{ initial?: ServiceData | null; categories: Category[]; loading?: boolean }>()
const emit = defineEmits<{ submit: [value: Record<string, unknown>] }>()
const fieldTypes = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'BOOLEAN',
  'SELECT',
  'MULTISELECT',
  'DATE',
  'EMAIL',
  'PHONE'
]
const form = reactive({
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  categoryId: '',
  priceMode: 'QUOTE',
  price: null as number | null,
  priceIncludesTax: false,
  taxRate: null as number | null,
  estimatedDuration: '',
  warranty: '',
  remoteAvailable: false,
  onsiteAvailable: true,
  homeServiceAvailable: false,
  requiresDevice: false,
  allowAttachments: false,
  imageUrl: '',
  featured: false,
  active: false,
  metaTitle: '',
  metaDescription: '',
  fields: [] as Field[]
})

function hydrate(value?: ServiceData | null) {
  if (!value) return
  Object.assign(form, {
    ...value,
    price: value.price == null ? null : Number(value.price),
    taxRate: value.taxRate == null ? null : Number(value.taxRate),
    shortDescription: value.shortDescription || '',
    description: value.description || '',
    estimatedDuration: value.estimatedDuration || '',
    warranty: value.warranty || '',
    imageUrl: value.imageUrl || '',
    metaTitle: value.metaTitle || '',
    metaDescription: value.metaDescription || '',
    fields: (value.fields || [])
      .filter((item) => !item.deletedAt)
      .map((item, index) => ({
        id: item.id as string,
        key: String(item.key),
        label: String(item.label),
        description: String(item.description || ''),
        placeholder: String(item.placeholder || ''),
        type: String(item.type),
        required: Boolean(item.required),
        active: Boolean(item.active),
        sortOrder: Number(item.sortOrder ?? index),
        validationConfig: null,
        options: ((item.options as Array<Record<string, unknown>>) || []).map((option, optionIndex) => ({
          id: option.id as string,
          value: String(option.value),
          label: String(option.label),
          sortOrder: Number(option.sortOrder ?? optionIndex),
          active: Boolean(option.active)
        }))
      }))
  })
}
watch(() => props.initial, hydrate, { immediate: true })
function addField() {
  form.fields.push({
    key: `campo_${form.fields.length + 1}`,
    label: '',
    description: '',
    placeholder: '',
    type: 'TEXT',
    required: false,
    active: true,
    sortOrder: form.fields.length,
    validationConfig: null,
    options: []
  })
}
function removeField(index: number) {
  form.fields.splice(index, 1)
  form.fields.forEach((field, order) => {
    field.sortOrder = order
  })
}
function move(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= form.fields.length) return
  const [field] = form.fields.splice(index, 1)
  form.fields.splice(target, 0, field!)
  form.fields.forEach((item, order) => {
    item.sortOrder = order
  })
}
function addOption(field: Field) {
  field.options.push({
    value: `opcion_${field.options.length + 1}`,
    label: '',
    sortOrder: field.options.length,
    active: true
  })
}
function submit() {
  emit('submit', {
    ...form,
    slug: form.slug || undefined,
    price: form.priceMode === 'QUOTE' ? null : form.price,
    imageUrl: form.imageUrl || null,
    shortDescription: form.shortDescription || null,
    description: form.description || null,
    estimatedDuration: form.estimatedDuration || null,
    warranty: form.warranty || null,
    metaTitle: form.metaTitle || null,
    metaDescription: form.metaDescription || null,
    fields: form.fields.map((field, index) => ({
      ...field,
      sortOrder: index,
      description: field.description || null,
      placeholder: field.placeholder || null,
      options: ['SELECT', 'MULTISELECT'].includes(field.type)
        ? field.options.map((option, optionIndex) => ({ ...option, sortOrder: optionIndex }))
        : []
    }))
  })
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="submit">
    <UCard class="bg-default ring-default"
      ><h2 class="mb-5 text-xl font-bold">Información general</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Nombre" required><UInput v-model="form.name" required class="w-full" /></UFormField
        ><UFormField label="Slug"
          ><UInput v-model="form.slug" class="w-full" placeholder="Automático" /></UFormField
        ><UFormField label="Categoría" required
          ><select
            v-model="form.categoryId"
            data-testid="service-category"
            required
            class="w-full rounded-md border border-default bg-default px-3 py-2"
          >
            <option value="">Selecciona</option>
            <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select></UFormField
        ><UFormField label="Imagen URL"><UInput v-model="form.imageUrl" class="w-full" /></UFormField
        ><UFormField label="Descripción corta" class="sm:col-span-2"
          ><UTextarea v-model="form.shortDescription" class="w-full" /></UFormField
        ><UFormField label="Descripción completa" class="sm:col-span-2"
          ><UTextarea v-model="form.description" class="w-full" :rows="7"
        /></UFormField></div
    ></UCard>
    <UCard class="bg-default ring-default"
      ><h2 class="mb-5 text-xl font-bold">Precio y atención</h2>
      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField label="Modalidad de precio"
          ><select
            v-model="form.priceMode"
            class="w-full rounded-md border border-default bg-default px-3 py-2"
          >
            <option value="FIXED">Precio fijo</option>
            <option value="FROM">Desde</option>
            <option value="QUOTE">Cotización</option>
          </select></UFormField
        ><UFormField label="Precio"
          ><UInput
            v-model.number="form.price"
            type="number"
            step="0.01"
            :disabled="form.priceMode === 'QUOTE'"
            class="w-full" /></UFormField
        ><UFormField label="Impuesto %"
          ><UInput v-model.number="form.taxRate" type="number" step="0.01" class="w-full" /></UFormField
        ><UFormField label="Duración estimada"
          ><UInput v-model="form.estimatedDuration" class="w-full" /></UFormField
        ><UFormField label="Garantía"><UInput v-model="form.warranty" class="w-full" /></UFormField>
        <div class="flex flex-wrap items-end gap-4">
          <UCheckbox v-model="form.priceIncludesTax" label="Precio incluye impuesto" /><UCheckbox
            v-model="form.remoteAvailable"
            label="Remoto"
          /><UCheckbox v-model="form.onsiteAvailable" label="En taller" /><UCheckbox
            v-model="form.homeServiceAvailable"
            label="A domicilio"
          />
        </div></div
    ></UCard>
    <UCard class="bg-default ring-default"
      ><div class="mb-5 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold">Formulario dinámico</h2>
          <p class="text-sm text-muted">
            Define las preguntas que el cliente completará al solicitar este servicio.
          </p>
        </div>
        <UButton type="button" label="Agregar campo" icon="i-lucide-plus" variant="soft" @click="addField" />
      </div>
      <div v-if="form.fields.length" class="space-y-4">
        <div
          v-for="(field, index) in form.fields"
          :key="field.id || index"
          class="rounded-xl border border-default p-4"
        >
          <div class="mb-3 flex justify-between">
            <strong>Campo {{ index + 1 }}</strong>
            <div>
              <UButton
                type="button"
                icon="i-lucide-arrow-up"
                color="neutral"
                variant="ghost"
                @click="move(index, -1)"
              /><UButton
                type="button"
                icon="i-lucide-arrow-down"
                color="neutral"
                variant="ghost"
                @click="move(index, 1)"
              /><UButton
                type="button"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                @click="removeField(index)"
              />
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <UFormField label="Clave" required
              ><UInput
                v-model="field.key"
                :data-testid="`service-field-key-${index}`"
                required
                class="w-full"
            /></UFormField>
            ><UFormField label="Etiqueta" required
              ><UInput
                v-model="field.label"
                :data-testid="`service-field-label-${index}`"
                required
                class="w-full"
            /></UFormField>
            ><UFormField label="Tipo"
              ><select
                v-model="field.type"
                class="w-full rounded-md border border-default bg-default px-3 py-2"
              >
                <option v-for="type in fieldTypes" :key="type" :value="type">{{ adminLabel(type) }}</option>
              </select></UFormField
            ><UFormField label="Ayuda"><UInput v-model="field.description" class="w-full" /></UFormField
            ><UFormField label="Placeholder"
              ><UInput v-model="field.placeholder" class="w-full"
            /></UFormField>
            <div class="flex items-center gap-4">
              <UCheckbox v-model="field.required" label="Obligatorio" /><UCheckbox
                v-model="field.active"
                label="Activo"
              />
            </div>
          </div>
          <div v-if="['SELECT', 'MULTISELECT'].includes(field.type)" class="mt-4 rounded-lg bg-default p-3">
            <div class="mb-2 flex justify-between">
              <span class="font-medium">Opciones</span
              ><UButton type="button" size="xs" label="Agregar opción" @click="addOption(field)" />
            </div>
            <div
              v-for="(option, optionIndex) in field.options"
              :key="option.id || optionIndex"
              class="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2"
            >
              <UInput v-model="option.value" placeholder="valor" /><UInput
                v-model="option.label"
                placeholder="Etiqueta"
              /><UButton
                type="button"
                icon="i-lucide-x"
                color="error"
                variant="ghost"
                @click="field.options.splice(optionIndex, 1)"
              />
            </div>
          </div>
        </div>
      </div>
      <UEmpty v-else title="Sin campos personalizados"
    /></UCard>
    <UCard class="bg-default ring-default"
      ><h2 class="mb-5 text-xl font-bold">Publicación y SEO</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Meta title"><UInput v-model="form.metaTitle" class="w-full" /></UFormField
        ><UFormField label="Meta description"
          ><UInput v-model="form.metaDescription" class="w-full"
        /></UFormField>
        <div class="flex flex-wrap gap-5 sm:col-span-2">
          <UCheckbox v-model="form.featured" label="Destacado" /><UCheckbox
            v-model="form.active"
            label="Publicado"
          /><UCheckbox v-model="form.requiresDevice" label="Requiere equipo" /><UCheckbox
            v-model="form.allowAttachments"
            label="Admite adjuntos"
          />
        </div></div
    ></UCard>
    <div class="flex justify-end gap-3">
      <UButton to="/admin/servicios" label="Cancelar" color="neutral" variant="ghost" /><UButton
        type="submit"
        label="Guardar servicio"
        icon="i-lucide-save"
        :loading="loading"
      />
    </div>
  </form>
</template>
