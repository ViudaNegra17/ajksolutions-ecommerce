<script setup lang="ts">
const adminRequest = useAdminRequest({ domains: 'inventory' })
definePageMeta({ layout: 'admin' })

type Location = { id: string; locationCode: string; name: string }
type Product = { id: string; productCode: string; sku: string; name: string }
type Variant = { id: string; variantCode: string; sku: string; name?: string | null }
type Stock = {
  id: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  location: Location
  product: Product
  variant?: Variant | null
}
type Movement = {
  id: string
  movementCode: string
  type: string
  quantity: number
  quantityBefore: number
  quantityAfter: number
  reason: string
  createdAt: string
  location: Pick<Location, 'name' | 'locationCode'>
  product: Pick<Product, 'name' | 'productCode'>
  variant?: Pick<Variant, 'name' | 'variantCode'> | null
  createdBy: { firstName: string; lastName: string }
}
type PageData<T> = { items: T[]; pagination: { total: number; totalPages: number } }
type ProductDetail = Product & { variants: Variant[] }

const { user } = useUserSession()
const canAdjust = computed(() =>
  Boolean(user.value?.roles.includes('SUPER_ADMIN') || user.value?.permissions.includes('inventory.adjust'))
)
const toast = useToast()
const tab = ref<'stock' | 'movements'>('stock')
const page = ref(1)
const search = ref('')
const locationId = ref('')
const adjustmentOpen = ref(false)
const saving = ref(false)
const selectedProduct = ref<ProductDetail | null>(null)
const adjustment = reactive({
  locationId: '',
  productId: '',
  variantId: '',
  type: 'ADJUSTMENT_IN',
  quantity: 1,
  reason: '',
  notes: ''
})

const query = computed(() => ({
  page: page.value,
  pageSize: 20,
  search: search.value,
  locationId: locationId.value
}))
const {
  data: stockData,
  status: stockStatus,
  error: stockError,
  refresh: refreshStock
} = await useFetch<{ success: true; data: PageData<Stock> }>('/api/admin/inventory', {
  query,
  key: 'admin:inventory:stock'
})
const {
  data: movementData,
  status: movementStatus,
  error: movementError,
  refresh: refreshMovements
} = await useFetch<{ success: true; data: PageData<Movement> }>('/api/admin/inventory/movements', {
  query,
  key: 'admin:inventory:movements'
})
const { data: locationData } = await useFetch<{ success: true; data: Location[] }>(
  '/api/admin/inventory/locations'
)
const { data: productData } = await useFetch<{ success: true; data: PageData<Product> }>(
  '/api/admin/products',
  {
    query: { page: 1, pageSize: 100, active: 'true' }
  }
)

const locations = computed(() => locationData.value?.data || [])
const products = computed(() => productData.value?.data.items || [])
const currentData = computed(() => (tab.value === 'stock' ? stockData.value?.data : movementData.value?.data))
const currentStatus = computed(() => (tab.value === 'stock' ? stockStatus.value : movementStatus.value))
const currentError = computed(() => (tab.value === 'stock' ? stockError.value : movementError.value))

watch([tab, search, locationId], () => {
  page.value = 1
})
watch(
  () => adjustment.productId,
  async (productId) => {
    adjustment.variantId = ''
    selectedProduct.value = productId
      ? (await adminRequest<{ success: true; data: ProductDetail }>(`/api/admin/products/${productId}`)).data
      : null
  }
)

function openAdjustment(stock?: Stock) {
  Object.assign(adjustment, {
    locationId: stock?.location.id || locations.value[0]?.id || '',
    productId: stock?.product.id || '',
    variantId: stock?.variant?.id || '',
    type: 'ADJUSTMENT_IN',
    quantity: 1,
    reason: '',
    notes: ''
  })
  selectedProduct.value = stock ? { ...stock.product, variants: stock.variant ? [stock.variant] : [] } : null
  adjustmentOpen.value = true
}

async function saveAdjustment() {
  saving.value = true
  try {
    await adminRequest('/api/admin/inventory/adjust', {
      method: 'POST',
      body: {
        ...adjustment,
        variantId: adjustment.variantId || null,
        notes: adjustment.notes || null
      }
    })
    toast.add({ title: 'Stock ajustado y movimiento registrado', color: 'success' })
    adjustmentOpen.value = false
    await Promise.all([refreshStock(), refreshMovements()])
  } catch (cause) {
    toast.add({ title: 'No se pudo ajustar el stock', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}

function movementColor(quantity: number) {
  return quantity > 0 ? 'text-emerald-400' : 'text-red-400'
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Inventario"
      description="Stock físico por ubicación, separado de la disponibilidad informada por proveedores."
    >
      <UButton
        v-if="canAdjust"
        label="Ajustar stock"
        icon="i-lucide-package-plus"
        @click="openAdjustment()"
      />
    </AdminPageHeader>

    <div class="mb-4 flex flex-wrap gap-3">
      <UButton
        label="Existencias"
        :variant="tab === 'stock' ? 'solid' : 'soft'"
        color="neutral"
        @click="tab = 'stock'"
      />
      <UButton
        label="Movimientos"
        :variant="tab === 'movements' ? 'solid' : 'soft'"
        color="neutral"
        @click="tab = 'movements'"
      />
      <UInput
        v-model="search"
        placeholder="Producto, SKU o movimiento"
        icon="i-lucide-search"
        class="min-w-64"
      />
      <select v-model="locationId" class="rounded-md border border-default bg-default px-3">
        <option value="">Todas las ubicaciones</option>
        <option v-for="location in locations" :key="location.id" :value="location.id">
          {{ location.locationCode }} — {{ location.name }}
        </option>
      </select>
    </div>

    <UAlert v-if="currentError" color="error" title="No se pudo cargar el inventario" class="mb-4" />
    <UCard class="overflow-x-auto bg-default ring-default">
      <div v-if="currentStatus === 'pending'" class="space-y-3">
        <USkeleton v-for="index in 5" :key="index" class="h-10" />
      </div>

      <table v-else-if="tab === 'stock'" class="w-full min-w-210 text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th class="p-3">Producto</th>
            <th>Ubicación</th>
            <th>En mano</th>
            <th>Reservado</th>
            <th>Disponible</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="stock in stockData?.data.items" :key="stock.id" class="border-t border-default">
            <td class="p-3 font-medium">
              {{ stock.product.name }}
              <div class="text-xs text-muted">
                {{ stock.product.productCode }} · {{ stock.variant?.name || 'Producto simple' }}
              </div>
            </td>
            <td>{{ stock.location.locationCode }} — {{ stock.location.name }}</td>
            <td>{{ stock.quantityOnHand }}</td>
            <td>{{ stock.quantityReserved }}</td>
            <td class="font-semibold">{{ stock.quantityAvailable }}</td>
            <td class="text-right">
              <UButton v-if="canAdjust" label="Ajustar" variant="ghost" @click="openAdjustment(stock)" />
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else class="w-full min-w-240 text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th class="p-3">Movimiento</th>
            <th>Producto</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Saldo</th>
            <th>Motivo</th>
            <th>Usuario / fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="movement in movementData?.data.items" :key="movement.id" class="border-t border-default">
            <td class="p-3 font-mono text-xs">{{ movement.movementCode }}</td>
            <td>
              {{ movement.product.name }}
              <div class="text-xs text-muted">
                {{ movement.variant?.name || movement.product.productCode }}
              </div>
            </td>
            <td>{{ adminLabel(movement.type) }}</td>
            <td :class="movementColor(movement.quantity)" class="font-semibold">
              {{ movement.quantity > 0 ? '+' : '' }}{{ movement.quantity }}
            </td>
            <td>{{ movement.quantityBefore }} → {{ movement.quantityAfter }}</td>
            <td>{{ movement.reason }}</td>
            <td>
              {{ movement.createdBy.firstName }} {{ movement.createdBy.lastName }}
              <div class="text-xs text-muted">
                {{ new Date(movement.createdAt).toLocaleString('es-EC') }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <UEmpty
        v-if="currentStatus !== 'pending' && !currentData?.items.length"
        title="Sin registros de inventario"
        description="El primer ajuste creará la existencia y su trazabilidad."
      />
    </UCard>

    <UPagination
      v-if="currentData?.pagination.totalPages"
      v-model:page="page"
      :total="currentData.pagination.total"
      :items-per-page="20"
      class="mt-4"
    />

    <UModal v-model:open="adjustmentOpen" title="Ajustar stock">
      <template #body>
        <div class="space-y-4">
          <UAlert
            title="Ajuste de inventario"
            description="Se actualiza la existencia, se crea el movimiento y se registra la auditoría. Nunca se permite stock negativo."
          />
          <UFormField label="Ubicación" required>
            <select
              v-model="adjustment.locationId"
              class="w-full rounded-md border border-default bg-default p-2"
            >
              <option value="" disabled>Selecciona</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.locationCode }} — {{ location.name }}
              </option>
            </select>
          </UFormField>
          <UFormField label="Producto" required>
            <select
              v-model="adjustment.productId"
              class="w-full rounded-md border border-default bg-default p-2"
            >
              <option value="" disabled>Selecciona</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.productCode }} — {{ product.name }}
              </option>
            </select>
          </UFormField>
          <UFormField v-if="selectedProduct?.variants.length" label="Variante">
            <select
              v-model="adjustment.variantId"
              class="w-full rounded-md border border-default bg-default p-2"
            >
              <option value="">Producto simple</option>
              <option v-for="variant in selectedProduct.variants" :key="variant.id" :value="variant.id">
                {{ variant.variantCode }} — {{ variant.name || variant.sku }}
              </option>
            </select>
          </UFormField>
          <UFormField label="Tipo" required>
            <select v-model="adjustment.type" class="w-full rounded-md border border-default bg-default p-2">
              <option value="INITIAL">Stock inicial (+)</option>
              <option value="PURCHASE">Compra (+)</option>
              <option value="ADJUSTMENT_IN">Ajuste de entrada (+)</option>
              <option value="ADJUSTMENT_OUT">Ajuste de salida (-)</option>
              <option value="RETURN">Devolución (+)</option>
            </select>
          </UFormField>
          <UFormField label="Cantidad" required>
            <UInput v-model.number="adjustment.quantity" type="number" min="1" class="w-full" />
          </UFormField>
          <UFormField label="Motivo" required>
            <UInput v-model="adjustment.reason" placeholder="Mínimo 3 caracteres" class="w-full" />
          </UFormField>
          <UFormField label="Notas">
            <UTextarea v-model="adjustment.notes" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <UButton label="Cancelar" color="neutral" variant="ghost" @click="adjustmentOpen = false" />
        <UButton label="Confirmar ajuste" :loading="saving" @click="saveAdjustment" />
      </template>
    </UModal>
  </div>
</template>
