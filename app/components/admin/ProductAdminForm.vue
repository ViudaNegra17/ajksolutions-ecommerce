<script setup lang="ts">
import {
  warrantyChoice,
  warrantyOptions,
  warrantyText,
  type WarrantyChoice
} from '#shared/utils/product-warranty'

const adminRequest = useAdminRequest({ domains: 'products' })
const props = defineProps<{ productId?: string }>()
type Category = { id: string; name: string }
type Brand = { id: string; name: string }
type Supplier = { id: string; name: string; supplierCode: string }
type AttributeOption = { id: string; value: string; label: string }
type Attribute = {
  id: string
  name: string
  type: string
  unit?: string | null
  variant: boolean
  options: AttributeOption[]
  categories: Array<{ categoryId: string; required: boolean }>
}
type AttributeValue = {
  attributeId: string
  textValue: string | null
  numberValue: string | null
  booleanValue: boolean | null
  optionIds: string[]
}
type Variant = {
  id?: string
  sku?: string
  name: string
  priceOverride: string
  active: boolean
  optionIds: string[]
}
type SupplierProduct = {
  id?: string
  supplierId: string
  variantId: string | null
  supplierSku: string
  supplierCost: string
  supplierStock: number
  supplierUrl: string
  leadTimeDays: number | null
  active: boolean
}
type ImageInput = { url: string; storageKey: null; alt: string; sortOrder: number; isPrimary: boolean }
type ProductDetail = Record<string, unknown> & {
  productCode: string
  sku: string
  barcode?: string | null
  name: string
  slug: string
  categoryId: string
  brandId?: string | null
  priceMode: 'FIXED' | 'CONTACT'
  price?: string | null
  taxRate?: string | null
  priceIncludesTax: boolean
  productType: 'PHYSICAL' | 'DIGITAL'
  shortDescription?: string | null
  description?: string | null
  manageStock: boolean
  active: boolean
  featured: boolean
  warranty?: string | null
  weight?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  images: ImageInput[]
  attributeValues: Array<{
    attributeId: string
    textValue?: string | null
    numberValue?: string | null
    booleanValue?: boolean | null
    options: Array<{ optionId: string }>
  }>
  variants: Array<{
    id: string
    sku: string
    name?: string | null
    priceOverride?: string | null
    active: boolean
    attributeValues: Array<{ optionId: string }>
  }>
  supplierProducts: Array<{
    id: string
    supplierId: string
    variantId?: string | null
    supplierSku?: string | null
    supplierCost?: string | null
    supplierStock: number
    supplierUrl?: string | null
    leadTimeDays?: number | null
    active: boolean
  }>
}

const toast = useToast()
const saving = ref(false)
const selectedWarranty = ref<WarrantyChoice>('NONE')
const customWarranty = ref('')
watch(selectedWarranty, (choice) => {
  if (choice !== 'CUSTOM') customWarranty.value = ''
})
const activeTab = ref('general')
const tabs = [
  'general',
  'precio',
  'clasificación',
  'imágenes',
  'atributos',
  'variantes',
  'inventario',
  'proveedores',
  'seo'
]
const labels: Record<string, string> = {
  general: 'General',
  precio: 'Precio',
  clasificación: 'Clasificación',
  imágenes: 'Imágenes',
  atributos: 'Atributos',
  variantes: 'Variantes',
  inventario: 'Inventario',
  proveedores: 'Proveedores',
  seo: 'SEO'
}
const state = reactive({
  sku: '',
  barcode: '',
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  productType: 'PHYSICAL' as 'PHYSICAL' | 'DIGITAL',
  priceMode: 'CONTACT' as 'FIXED' | 'CONTACT',
  price: '',
  priceIncludesTax: false,
  taxRate: '',
  brandId: '',
  categoryId: '',
  manageStock: true,
  active: false,
  featured: false,
  warranty: '',
  weight: '',
  metaTitle: '',
  metaDescription: '',
  images: [] as ImageInput[],
  attributeValues: [] as AttributeValue[],
  variants: [] as Variant[],
  supplierProducts: [] as SupplierProduct[]
})
const variantSelections = reactive<Record<string, string[]>>({})
watch(
  () => state.productType,
  (productType) => {
    if (productType === 'DIGITAL') {
      state.manageStock = false
      state.weight = ''
    }
  }
)
const requestFetch = useRequestFetch()
const [categoriesResponse, brandsResponse, suppliersResponse, attributesResponse, taxResponse] =
  await Promise.all([
    requestFetch<{ success: true; data: Category[] }>('/api/admin/categories?tree=true&active=true'),
    requestFetch<{ success: true; data: { items: Brand[] } }>('/api/admin/brands?pageSize=100&active=true'),
    requestFetch<{ success: true; data: { items: Supplier[] } }>(
      '/api/admin/suppliers?pageSize=100&active=true'
    ),
    requestFetch<{ success: true; data: { items: Attribute[] } }>(
      '/api/admin/attributes?pageSize=100&active=true'
    ),
    requestFetch<{ success: true; data: Record<string, string | boolean> }>('/api/admin/catalog/settings')
  ])
const categories = categoriesResponse.data
const brands = brandsResponse.data.items
const suppliers = suppliersResponse.data.items
const attributes = attributesResponse.data.items
const productCode = ref('Se generará al guardar')

if (!props.productId) {
  state.taxRate = String(taxResponse.data['tax.defaultRate'] ?? '0.00')
  state.priceIncludesTax = Boolean(taxResponse.data['tax.pricesIncludeTaxDefault'] ?? false)
}
function applyProduct(product: ProductDetail) {
  productCode.value = product.productCode
  selectedWarranty.value = warrantyChoice(product.warranty)
  customWarranty.value = selectedWarranty.value === 'CUSTOM' ? product.warranty || '' : ''
  Object.assign(state, {
    sku: product.sku,
    barcode: product.barcode || '',
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    productType: product.productType,
    priceMode: product.priceMode,
    price: product.price?.toString() || '',
    priceIncludesTax: product.priceIncludesTax,
    taxRate: product.taxRate?.toString() || '',
    brandId: product.brandId || '',
    categoryId: product.categoryId,
    manageStock: product.manageStock,
    active: product.active,
    featured: product.featured,
    warranty: product.warranty || '',
    weight: product.weight?.toString() || '',
    metaTitle: product.metaTitle || '',
    metaDescription: product.metaDescription || '',
    images: product.images.map((image, index) => ({
      url: image.url,
      storageKey: null,
      alt: image.alt || '',
      sortOrder: image.sortOrder ?? index,
      isPrimary: image.isPrimary
    })),
    attributeValues: product.attributeValues.map((value) => ({
      attributeId: value.attributeId,
      textValue: value.textValue || null,
      numberValue: value.numberValue?.toString() || null,
      booleanValue: value.booleanValue ?? null,
      optionIds: value.options.map((option) => option.optionId)
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name || '',
      priceOverride: variant.priceOverride?.toString() || '',
      active: variant.active,
      optionIds: variant.attributeValues.map((value) => value.optionId)
    })),
    supplierProducts: product.supplierProducts.map((item) => ({
      id: item.id,
      supplierId: item.supplierId,
      variantId: item.variantId || null,
      supplierSku: item.supplierSku || '',
      supplierCost: item.supplierCost?.toString() || '',
      supplierStock: item.supplierStock,
      supplierUrl: item.supplierUrl || '',
      leadTimeDays: item.leadTimeDays ?? null,
      active: item.active
    }))
  })
}

if (props.productId) {
  const response = await requestFetch<{ success: true; data: ProductDetail }>(
    `/api/admin/products/${props.productId}`
  )
  applyProduct(response.data)
}

const categoryAttributes = computed(() =>
  attributes.filter((attribute) =>
    attribute.categories.some((category) => category.categoryId === state.categoryId)
  )
)
const variantAttributes = computed(() =>
  categoryAttributes.value.filter(
    (attribute) => attribute.variant && ['SELECT', 'MULTISELECT'].includes(attribute.type)
  )
)
watch(
  categoryAttributes,
  (current) => {
    for (const attribute of current)
      if (!state.attributeValues.some((value) => value.attributeId === attribute.id))
        state.attributeValues.push({
          attributeId: attribute.id,
          textValue: null,
          numberValue: null,
          booleanValue: null,
          optionIds: []
        })
  },
  { immediate: true }
)
function attributeValue(id: string) {
  return state.attributeValues.find((value) => value.attributeId === id)!
}
function toggleAttributeOption(attributeId: string, optionId: string, checked: boolean, multiple: boolean) {
  const value = attributeValue(attributeId)
  value.optionIds = checked
    ? multiple
      ? [...new Set([...value.optionIds, optionId])]
      : [optionId]
    : value.optionIds.filter((id) => id !== optionId)
}
function toggleVariantOption(attributeId: string, optionId: string, checked: boolean) {
  const current = variantSelections[attributeId] || []
  variantSelections[attributeId] = checked
    ? [...new Set([...current, optionId])]
    : current.filter((id) => id !== optionId)
}
function combinations(groups: string[][]): string[][] {
  return groups.reduce<string[][]>(
    (result, group) => result.flatMap((prefix) => group.map((item) => [...prefix, item])),
    [[]]
  )
}
function generateVariants() {
  const groups = variantAttributes.value.map((attribute) => variantSelections[attribute.id] || [])
  if (!groups.length || groups.some((group) => !group.length)) {
    toast.add({ title: 'Selecciona opciones para cada atributo de variante', color: 'warning' })
    return
  }
  const optionMap = new Map(
    attributes.flatMap((attribute) => attribute.options.map((option) => [option.id, option.label]))
  )
  state.variants = combinations(groups).map((optionIds) => ({
    name: optionIds.map((id) => optionMap.get(id)).join(' / '),
    priceOverride: '',
    active: true,
    optionIds
  }))
}
function addImage() {
  state.images.push({
    url: '',
    storageKey: null,
    alt: state.name,
    sortOrder: state.images.length,
    isPrimary: state.images.length === 0
  })
}
function setPrimaryImage(index: number) {
  state.images.forEach((image, imageIndex) => {
    image.isPrimary = imageIndex === index
  })
}
function addSupplier() {
  state.supplierProducts.push({
    supplierId: '',
    variantId: null,
    supplierSku: '',
    supplierCost: '',
    supplierStock: 0,
    supplierUrl: '',
    leadTimeDays: null,
    active: true
  })
}
function decimalOrNull(value: unknown): string | null {
  return value === '' || value == null ? null : String(value)
}
function requestErrorMessage(cause: unknown): string {
  return uiErrorMessage(cause)
}
async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const body = {
      ...state,
      sku: undefined,
      barcode: state.barcode.trim() || null,
      slug: undefined,
      brandId: state.brandId || null,
      price: state.priceMode === 'CONTACT' ? null : decimalOrNull(state.price),
      taxRate: decimalOrNull(state.taxRate),
      weight: decimalOrNull(state.weight),
      shortDescription: state.shortDescription || null,
      description: state.description || null,
      warranty: warrantyText(selectedWarranty.value, customWarranty.value),
      warrantyChoice: selectedWarranty.value,
      warrantyCustom: selectedWarranty.value === 'CUSTOM' ? customWarranty.value : null,
      metaTitle: state.metaTitle || null,
      metaDescription: state.metaDescription || null,
      images: state.images.filter((image) => image.url),
      attributeValues: state.attributeValues.filter((value) =>
        categoryAttributes.value.some((attribute) => attribute.id === value.attributeId)
      ),
      variants: state.variants.map((variant) => ({
        ...variant,
        sku: undefined,
        priceOverride: decimalOrNull(variant.priceOverride)
      })),
      supplierProducts: state.supplierProducts
        .filter((item) => item.supplierId)
        .map((item) => ({ ...item, supplierCost: decimalOrNull(item.supplierCost) }))
    }
    const response = await adminRequest<{ success: true; data: { id: string } }>(
      props.productId ? `/api/admin/products/${props.productId}` : '/api/admin/products',
      { method: props.productId ? 'PUT' : 'POST', body }
    )
    const saved = await requestFetch<{ success: true; data: ProductDetail }>(
      `/api/admin/products/${response.data.id}`
    )
    applyProduct(saved.data)
    toast.add({
      title: props.productId ? 'Producto actualizado' : 'Producto creado correctamente',
      color: 'success'
    })
    if (!props.productId) await navigateTo(`/admin/catalogo/productos/${response.data.id}`)
  } catch (cause) {
    toast.add({
      title: 'No se pudo guardar el producto',
      description: requestErrorMessage(cause),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      :title="productId ? `Editar ${productCode}` : 'Nuevo producto'"
      description="Completa la información del producto y elige cómo se publicará en la tienda. El código se asigna automáticamente."
    >
      <UButton to="/admin/catalogo/productos" label="Volver" color="neutral" variant="ghost" /><UButton
        label="Guardar producto"
        icon="i-lucide-save"
        :loading="saving"
        @click="save"
      />
    </AdminPageHeader>
    <div class="mb-5 flex gap-2 overflow-x-auto pb-2">
      <UButton
        v-for="tab in tabs"
        :key="tab"
        :label="labels[tab]"
        :variant="activeTab === tab ? 'solid' : 'soft'"
        color="neutral"
        @click="activeTab = tab"
      />
    </div>
    <UCard class="bg-default ring-default">
      <div v-if="activeTab === 'general'" class="grid gap-4 md:grid-cols-2">
        <UFormField label="Nombre" required><UInput v-model="state.name" class="w-full" /></UFormField
        ><UFormField
          label="Código / código de barras"
          description="Escribe el código del producto o escanéalo con un lector."
          ><UInput v-model="state.barcode" maxlength="100" class="w-full" /></UFormField
        ><UFormField v-if="productId" label="Código interno"
          ><UInput :model-value="productCode" readonly class="w-full" /></UFormField
        ><UFormField label="Tipo de producto" required>
          <select v-model="state.productType" class="w-full rounded-md border border-default bg-default p-2">
            <option value="PHYSICAL">Producto físico</option>
            <option value="DIGITAL">Producto digital</option>
          </select>
        </UFormField>
        <div class="flex flex-wrap items-end gap-5">
          <UCheckbox v-model="state.active" label="Activo" /><UCheckbox
            v-model="state.featured"
            label="Destacado"
          /><UCheckbox
            v-model="state.manageStock"
            label="Administrar stock"
            :disabled="state.productType === 'DIGITAL'"
          />
        </div>
        <UFormField label="Descripción corta" class="md:col-span-2">
          <UTextarea v-model="state.shortDescription" class="w-full" /> </UFormField
        ><UFormField label="Descripción" class="md:col-span-2">
          <UTextarea v-model="state.description" :rows="8" class="w-full" /> </UFormField
        ><UFormField label="Garantía"
          ><USelect
            v-model="selectedWarranty"
            :items="warrantyOptions.map((option) => ({ ...option }))"
            class="w-full"
        /></UFormField>
        <UFormField v-if="selectedWarranty === 'CUSTOM'" label="Garantía personalizada" required
          ><UInput v-model="customWarranty" maxlength="255" class="w-full"
        /></UFormField>
        <UFormField v-if="state.productType === 'PHYSICAL'" label="Peso (kg)">
          <UInput v-model="state.weight" type="number" step="0.001" min="0" class="w-full" />
        </UFormField>
      </div>
      <div v-else-if="activeTab === 'precio'" class="grid gap-4 md:grid-cols-2">
        <UFormField label="Modo de precio">
          <select v-model="state.priceMode" class="w-full rounded-md border border-default bg-default p-2">
            <option value="FIXED">Precio fijo</option>
            <option value="CONTACT">Consultar precio</option>
          </select> </UFormField
        ><UAlert
          class="md:col-span-2"
          :title="
            state.priceMode === 'CONTACT' ? 'El cliente consultará el precio' : 'Precio comercial público'
          "
          :description="
            state.priceMode === 'CONTACT'
              ? 'Completa la información comercial para responder su consulta.'
              : 'La tasa se toma de configuración y puede ajustarse por producto.'
          "
        /><template v-if="state.priceMode === 'FIXED'">
          <UFormField label="Precio" required>
            <UInput v-model="state.price" type="number" min="0" step="0.01" class="w-full" /> </UFormField
          ><UFormField label="Tasa IVA (%)">
            <UInput
              v-model="state.taxRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              class="w-full"
            /> </UFormField
          ><UCheckbox v-model="state.priceIncludesTax" label="Precio con IVA incluido" />
        </template>
      </div>
      <div v-else-if="activeTab === 'clasificación'" class="grid gap-4 md:grid-cols-2">
        <UFormField label="Categoría" required>
          <select v-model="state.categoryId" class="w-full rounded-md border border-default bg-default p-2">
            <option value="" disabled>Selecciona</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select> </UFormField
        ><UFormField label="Marca">
          <select v-model="state.brandId" class="w-full rounded-md border border-default bg-default p-2">
            <option value="">Sin marca</option>
            <option v-for="brand in brands" :key="brand.id" :value="brand.id">{{ brand.name }}</option>
          </select>
        </UFormField>
      </div>
      <div v-else-if="activeTab === 'imágenes'">
        <div class="mb-4 flex justify-between">
          <p class="text-muted">Agrega enlaces de imágenes y elige cuál aparecerá primero.</p>
          <UButton label="Agregar URL" icon="i-lucide-plus" @click="addImage" />
        </div>
        <div class="space-y-4">
          <div
            v-for="(image, index) in state.images"
            :key="index"
            class="grid gap-3 rounded-lg border border-default p-4 md:grid-cols-[1fr_1fr_auto_auto]"
          >
            <UInput v-model="image.url" placeholder="https://..." /><UInput
              v-model="image.alt"
              placeholder="Texto alternativo"
            /><UButton
              :label="image.isPrimary ? 'Principal' : 'Hacer principal'"
              :variant="image.isPrimary ? 'solid' : 'soft'"
              @click="setPrimaryImage(index)"
            /><UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              aria-label="Quitar imagen"
              @click="state.images.splice(index, 1)"
            />
          </div>
          <UEmpty v-if="!state.images.length" title="Sin imágenes" />
        </div>
      </div>
      <div v-else-if="activeTab === 'atributos'">
        <UAlert v-if="!state.categoryId" title="Selecciona primero una categoría" />
        <div v-else class="grid gap-5 md:grid-cols-2">
          <UFormField
            v-for="attribute in categoryAttributes"
            :key="attribute.id"
            :label="`${attribute.name}${attribute.categories.find((item) => item.categoryId === state.categoryId)?.required ? ' *' : ''}`"
          >
            <UInput
              v-if="attribute.type === 'TEXT'"
              :model-value="attributeValue(attribute.id).textValue || ''"
              @update:model-value="attributeValue(attribute.id).textValue = String($event)"
            /><UInput
              v-else-if="attribute.type === 'NUMBER'"
              :model-value="attributeValue(attribute.id).numberValue || ''"
              type="number"
              @update:model-value="attributeValue(attribute.id).numberValue = String($event)"
            /><UCheckbox
              v-else-if="attribute.type === 'BOOLEAN'"
              :model-value="attributeValue(attribute.id).booleanValue || false"
              label="Sí"
              @update:model-value="attributeValue(attribute.id).booleanValue = Boolean($event)"
            />
            <div v-else class="space-y-2">
              <UCheckbox
                v-for="option in attribute.options"
                :key="option.id"
                :model-value="attributeValue(attribute.id).optionIds.includes(option.id)"
                :label="option.label"
                @update:model-value="
                  toggleAttributeOption(
                    attribute.id,
                    option.id,
                    Boolean($event),
                    attribute.type === 'MULTISELECT'
                  )
                "
              />
            </div> </UFormField
          ><UEmpty v-if="!categoryAttributes.length" title="La categoría no tiene atributos configurados" />
        </div>
      </div>
      <div v-else-if="activeTab === 'variantes'">
        <div v-if="variantAttributes.length" class="grid gap-5 md:grid-cols-2">
          <UCard v-for="attribute in variantAttributes" :key="attribute.id" class="bg-default">
            <h3 class="font-semibold">{{ attribute.name }}</h3>
            <div class="mt-3 flex flex-wrap gap-3">
              <UCheckbox
                v-for="option in attribute.options"
                :key="option.id"
                :model-value="variantSelections[attribute.id]?.includes(option.id)"
                :label="option.label"
                @update:model-value="toggleVariantOption(attribute.id, option.id, Boolean($event))"
              />
            </div>
          </UCard>
          <div class="md:col-span-2">
            <UButton label="Generar combinaciones" icon="i-lucide-sparkles" @click="generateVariants" />
          </div>
        </div>
        <UAlert v-else title="No hay atributos de variante en la categoría" />
        <div class="mt-6 space-y-3">
          <div
            v-for="(variant, index) in state.variants"
            :key="variant.id || index"
            class="grid gap-3 rounded-lg border border-default p-3 md:grid-cols-4"
          >
            <UInput v-model="variant.name" placeholder="Combinación" /><UInput
              v-model="variant.priceOverride"
              type="number"
              step="0.01"
              placeholder="Precio opcional"
            />
            <div class="flex items-center gap-2">
              <UCheckbox v-model="variant.active" label="Activa" /><UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                aria-label="Quitar variante"
                @click="state.variants.splice(index, 1)"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="activeTab === 'inventario'">
        <UAlert
          v-if="state.productType === 'DIGITAL'"
          title="Los productos digitales no usan inventario"
          description="Su disponibilidad comercial depende de que el producto esté activo."
        />
        <UAlert
          v-else
          title="El stock no se edita directamente"
          description="Guarda el producto y utiliza Ajustar stock para registrar las entradas y salidas con su motivo."
        /><UButton
          to="/admin/catalogo/inventario"
          label="Abrir inventario"
          icon="i-lucide-warehouse"
          class="mt-5"
        />
      </div>
      <div v-else-if="activeTab === 'proveedores'">
        <div class="mb-4 flex justify-between">
          <p class="text-muted">Este stock nunca se suma al inventario físico.</p>
          <UButton label="Agregar proveedor" icon="i-lucide-plus" @click="addSupplier" />
        </div>
        <div class="space-y-4">
          <div
            v-for="(item, index) in state.supplierProducts"
            :key="item.id || index"
            class="grid gap-3 rounded-lg border border-default p-4 md:grid-cols-3"
          >
            <select v-model="item.supplierId" class="rounded-md border border-default bg-default p-2">
              <option value="">Proveedor</option>
              <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                {{ supplier.supplierCode }} — {{ supplier.name }}
              </option></select
            ><UInput v-model="item.supplierSku" placeholder="SKU proveedor" /><UInput
              v-model="item.supplierCost"
              type="number"
              min="0"
              step="0.01"
              placeholder="Costo"
            /><UInput
              v-model.number="item.supplierStock"
              type="number"
              min="0"
              placeholder="Stock proveedor"
            /><UInput
              v-model.number="item.leadTimeDays"
              type="number"
              min="0"
              placeholder="Días entrega"
            /><UInput v-model="item.supplierUrl" placeholder="URL proveedor" />
            <div class="flex gap-3">
              <UCheckbox v-model="item.active" label="Activo" /><UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                @click="state.supplierProducts.splice(index, 1)"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="activeTab === 'seo'" class="grid gap-4">
        <UFormField label="Meta title"><UInput v-model="state.metaTitle" class="w-full" /></UFormField
        ><UFormField label="Meta description">
          <UTextarea v-model="state.metaDescription" class="w-full" />
        </UFormField>
      </div>
    </UCard>
  </div>
</template>
