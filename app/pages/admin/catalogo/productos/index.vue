<script setup lang="ts">
const adminRequest = useAdminRequest({ domains: 'products' })
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Productos', robots: 'noindex, nofollow' })
type Product = {
  id: string
  productCode: string
  sku: string
  name: string
  priceMode: 'FIXED' | 'CONTACT'
  price?: string | null
  active: boolean
  featured: boolean
  category: { name: string }
  brand?: { name: string } | null
  images: Array<{ url: string; alt?: string | null }>
  ownStock: number
  supplierStock: number
}
type PageData = { items: Product[]; pagination: { total: number; totalPages: number } }
type Option = { id: string; name: string }
const toast = useToast()
const page = ref(1)
const confirmOpen = ref(false)
const deleting = ref(false)
const selected = ref<Product | null>(null)
const filters = reactive({
  search: '',
  categoryId: '',
  brandId: '',
  supplierId: '',
  active: '',
  featured: '',
  priceMode: '',
  stock: ''
})
const query = computed(() => ({ ...filters, page: page.value, pageSize: 20 }))
const { data, status, error, refresh } = await useFetch<{ success: true; data: PageData }>(
  '/api/admin/products',
  { query, key: 'admin:products:list' }
)
const { data: categories } = await useFetch<{ success: true; data: Option[] }>('/api/admin/categories', {
  query: { tree: 'true' }
})
const { data: brands } = await useFetch<{ success: true; data: { items: Option[] } }>('/api/admin/brands', {
  query: { pageSize: 100 }
})
const { data: suppliers } = await useFetch<{ success: true; data: { items: Option[] } }>(
  '/api/admin/suppliers',
  { query: { pageSize: 100 } }
)
watch(filters, () => {
  page.value = 1
})
const money = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })
function confirmRemove(item: Product) {
  selected.value = item
  confirmOpen.value = true
}
async function remove() {
  if (!selected.value) return
  deleting.value = true
  try {
    await adminRequest(`/api/admin/products/${selected.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Producto eliminado', color: 'success' })
    confirmOpen.value = false
    await refresh()
  } catch (cause) {
    toast.add({
      title: 'No se pudo eliminar el producto',
      description: uiErrorMessage(cause),
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Productos"
      description="Catálogo comercial, precios, variantes y fuentes de disponibilidad."
    >
      <UButton
        to="/admin/catalogo/productos/nuevo"
        label="Nuevo producto"
        icon="i-lucide-plus"
      /> </AdminPageHeader
    ><UCard class="mb-4 bg-default ring-default">
      <div class="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <UInput
          v-model="filters.search"
          placeholder="Código, SKU, nombre o slug"
          icon="i-lucide-search"
        /><select v-model="filters.categoryId" class="rounded-md border border-default bg-default p-2">
          <option value="">Todas las categorías</option>
          <option v-for="item in categories?.data" :key="item.id" :value="item.id">
            {{ item.name }}
          </option></select
        ><select v-model="filters.brandId" class="rounded-md border border-default bg-default p-2">
          <option value="">Todas las marcas</option>
          <option v-for="item in brands?.data.items" :key="item.id" :value="item.id">
            {{ item.name }}
          </option></select
        ><select v-model="filters.supplierId" class="rounded-md border border-default bg-default p-2">
          <option value="">Todos los proveedores</option>
          <option v-for="item in suppliers?.data.items" :key="item.id" :value="item.id">
            {{ item.name }}
          </option></select
        ><select v-model="filters.active" class="rounded-md border border-default bg-default p-2">
          <option value="">Cualquier estado</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option></select
        ><select v-model="filters.featured" class="rounded-md border border-default bg-default p-2">
          <option value="">Destacado o no</option>
          <option value="true">Destacados</option>
          <option value="false">No destacados</option></select
        ><select v-model="filters.priceMode" class="rounded-md border border-default bg-default p-2">
          <option value="">Cualquier precio</option>
          <option value="FIXED">Precio fijo</option>
          <option value="CONTACT">Consultar</option></select
        ><select v-model="filters.stock" class="rounded-md border border-default bg-default p-2">
          <option value="">Cualquier stock</option>
          <option value="with">Con stock propio</option>
          <option value="without">Sin stock propio</option>
        </select>
      </div> </UCard
    ><UAlert v-if="error" color="error" title="No se pudieron cargar los productos" /><UCard
      class="overflow-x-auto bg-default ring-default"
    >
      <div v-if="status === 'pending'" class="space-y-3">
        <USkeleton v-for="index in 6" :key="index" class="h-14" />
      </div>
      <table v-else class="w-full min-w-280 text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th class="p-3">Imagen</th>
            <th>Código / SKU</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Marca</th>
            <th>Precio</th>
            <th>Stock propio</th>
            <th>Proveedor</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data.items" :key="item.id" class="border-t border-default">
            <td class="p-3">
              <img
                v-if="item.images[0]"
                :src="item.images[0].url"
                :alt="item.images[0].alt || item.name"
                class="size-12 rounded-lg object-cover"
              />
              <div v-else class="grid size-12 place-items-center rounded-lg bg-muted">
                <UIcon name="i-lucide-image" />
              </div>
            </td>
            <td>
              <div class="font-mono text-primary">{{ item.productCode }}</div>
              <div class="text-xs text-muted">{{ item.sku }}</div>
            </td>
            <td class="font-medium">
              {{ item.name }}<UBadge v-if="item.featured" class="ml-2" size="xs">Destacado</UBadge>
            </td>
            <td>{{ item.category.name }}</td>
            <td>{{ item.brand?.name || '—' }}</td>
            <td>{{ item.priceMode === 'CONTACT' ? 'Consultar' : money.format(Number(item.price)) }}</td>
            <td>{{ item.ownStock }}</td>
            <td>{{ item.supplierStock }}</td>
            <td><AdminStatusBadge :active="item.active" /></td>
            <td class="text-right">
              <UButton
                :to="`/admin/catalogo/productos/${item.id}`"
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
                aria-label="Editar"
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
      <UEmpty
        v-if="status !== 'pending' && !data?.data.items.length"
        title="Sin productos"
        description="Crea el primer producto real del catálogo."
      /> </UCard
    ><UPagination
      v-if="data?.data.pagination.totalPages"
      v-model:page="page"
      :total="data.data.pagination.total"
      :items-per-page="20"
      class="mt-4"
    /><AdminConfirmDialog
      :open="confirmOpen"
      title="¿Desactivar producto?"
      description="El producto dejará de estar publicado. Se conservará su historial."
      :loading="deleting"
      @close="confirmOpen = false"
      @confirm="remove"
    />
  </div>
</template>
