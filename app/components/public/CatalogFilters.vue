<script setup lang="ts">
import type { PublicAttributeFilter, PublicCategory } from '#shared/types/public-catalog'

type Brand = { name: string; slug: string }
type FilterState = Record<string, string | undefined>

const props = defineProps<{
  categories: PublicCategory[]
  brands: Brand[]
  attributes: PublicAttributeFilter[]
  state: FilterState
}>()
const emit = defineEmits<{ 'update-filters': [patch: FilterState] }>()

function flatCategories(items: PublicCategory[], depth = 0): Array<PublicCategory & { depth: number }> {
  return items.flatMap((item) => [{ ...item, depth }, ...flatCategories(item.children, depth + 1)])
}

const categoryOptions = computed(() => flatCategories(props.categories))

function parsedAttributes() {
  const result = new Map<string, string[]>()
  for (const item of (props.state.attributes || '').split(',').filter(Boolean)) {
    const [slug, values = ''] = item.split(':')
    if (slug) result.set(slug, values.split('|').filter(Boolean))
  }
  return result
}

function attributeChecked(slug: string, value: string) {
  return parsedAttributes().get(slug)?.includes(value) || false
}

function toggleAttribute(slug: string, value: string, checked: boolean) {
  const selected = parsedAttributes()
  const values = new Set(selected.get(slug) || [])
  if (checked) values.add(value)
  else values.delete(value)
  if (values.size) selected.set(slug, [...values])
  else selected.delete(slug)
  emit('update-filters', {
    attributes: [...selected].map(([key, items]) => `${key}:${items.join('|')}`).join(',') || undefined
  })
}
</script>

<template>
  <form class="space-y-6" @submit.prevent>
    <div>
      <label for="filter-category" class="mb-2 block text-sm font-semibold text-white">Categoría</label>
      <select
        id="filter-category"
        :value="state.category || ''"
        class="public-select"
        @change="
          emit('update-filters', {
            category: ($event.target as HTMLSelectElement).value || undefined
          })
        "
      >
        <option value="">Todas</option>
        <option v-for="category in categoryOptions" :key="category.slug" :value="category.slug">
          {{ '— '.repeat(category.depth) }}{{ category.name }}
        </option>
      </select>
    </div>
    <div>
      <label for="filter-brand" class="mb-2 block text-sm font-semibold text-white">Marca</label>
      <select
        id="filter-brand"
        :value="state.brand || ''"
        class="public-select"
        @change="
          emit('update-filters', {
            brand: ($event.target as HTMLSelectElement).value || undefined
          })
        "
      >
        <option value="">Todas</option>
        <option v-for="brand in brands" :key="brand.slug" :value="brand.slug">{{ brand.name }}</option>
      </select>
    </div>
    <div>
      <label for="filter-price-mode" class="mb-2 block text-sm font-semibold text-white">Precio</label>
      <select
        id="filter-price-mode"
        :value="state.priceMode || ''"
        class="public-select"
        @change="
          emit('update-filters', {
            priceMode: ($event.target as HTMLSelectElement).value || undefined
          })
        "
      >
        <option value="">Todos</option>
        <option value="FIXED">Precio publicado</option>
        <option value="CONTACT">Consultar precio</option>
      </select>
    </div>
    <div>
      <label for="filter-availability" class="mb-2 block text-sm font-semibold text-white"
        >Disponibilidad</label
      >
      <select
        id="filter-availability"
        :value="state.availability || ''"
        class="public-select"
        @change="
          emit('update-filters', {
            availability: ($event.target as HTMLSelectElement).value || undefined
          })
        "
      >
        <option value="">Todas</option>
        <option value="OWN_STOCK">Entrega inmediata</option>
        <option value="SUPPLIER_STOCK">Bajo pedido</option>
        <option value="OUT_OF_STOCK">Agotado</option>
      </select>
    </div>
    <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-200">
      <input
        type="checkbox"
        :checked="state.featured === 'true'"
        class="size-4 accent-cyan-400"
        @change="
          emit('update-filters', {
            featured: ($event.target as HTMLInputElement).checked ? 'true' : undefined
          })
        "
      />
      Solo destacados
    </label>
    <fieldset v-for="attribute in attributes" :key="attribute.slug">
      <legend class="mb-2 text-sm font-semibold text-white">{{ attribute.name }}</legend>
      <label
        v-for="option in attribute.options"
        :key="option.value"
        class="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-slate-300"
      >
        <input
          type="checkbox"
          :checked="attributeChecked(attribute.slug, option.value)"
          class="size-4 accent-cyan-400"
          @change="toggleAttribute(attribute.slug, option.value, ($event.target as HTMLInputElement).checked)"
        />
        {{ option.label }}
      </label>
    </fieldset>
    <UButton
      label="Limpiar filtros"
      color="neutral"
      variant="outline"
      icon="i-lucide-rotate-ccw"
      block
      @click="emit('update-filters', { __clear: 'true' })"
    />
  </form>
</template>
