<script setup lang="ts">
const adminRequest = useAdminRequest()
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Configuración', robots: 'noindex, nofollow' })
type Settings = {
  business: {
    name: string
    whatsapp: string
    email: string
    phone: string
    address: string
    city: string
    country: string
    timeZone: string
  }
  commerce: { currency: string; taxRate: number; pricesIncludeTax: boolean }
  inventory: { defaultLocationCode: string; lowStockThreshold: number }
  operations: { orderAlertHours: number; ticketAlertHours: number }
  seo: { siteName: string; defaultTitle: string; defaultDescription: string }
  social: { facebook: string; instagram: string }
}
const toast = useToast()
const saving = ref(false)
const { data, status, error, refresh } = await useFetch<{ success: true; data: Settings }>(
  '/api/admin/settings'
)
const form = reactive<Settings>({
  business: {
    name: '',
    whatsapp: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'EC',
    timeZone: 'America/Guayaquil'
  },
  commerce: { currency: 'USD', taxRate: 0, pricesIncludeTax: false },
  inventory: { defaultLocationCode: 'LOC-000001', lowStockThreshold: 3 },
  operations: { orderAlertHours: 24, ticketAlertHours: 24 },
  seo: { siteName: '', defaultTitle: '', defaultDescription: '' },
  social: { facebook: '', instagram: '' }
})
watchEffect(() => {
  if (data.value?.data) Object.assign(form, structuredClone(data.value.data))
})
async function save() {
  saving.value = true
  try {
    const result = await adminRequest<{ success: true; data: Settings }>('/api/admin/settings', {
      method: 'PUT',
      body: form
    })
    Object.assign(form, result.data)
    toast.add({ title: 'Configuración guardada', color: 'success' })
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo guardar', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Configuración operativa"
      description="Administra los datos del negocio, las condiciones de venta y las alertas del equipo."
    >
      <UButton label="Guardar configuración" icon="i-lucide-save" :loading="saving" @click="save" />
    </AdminPageHeader>
    <UAlert
      v-if="error"
      color="error"
      title="No se pudo cargar la configuración"
      :actions="[{ label: 'Reintentar', onClick: () => refresh() }]"
    />
    <div v-if="status === 'pending'" class="grid gap-5 lg:grid-cols-2">
      <USkeleton v-for="i in 4" :key="i" class="h-64 rounded-2xl" />
    </div>
    <div v-else class="grid gap-5 lg:grid-cols-2">
      <UCard class="bg-default ring-default"
        ><h2 class="text-xl font-bold">Negocio</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Nombre"><UInput v-model="form.business.name" class="w-full" /></UFormField
          ><UFormField label="WhatsApp"
            ><UInput v-model="form.business.whatsapp" class="w-full"
          /></UFormField>
          <UFormField label="Email"
            ><UInput v-model="form.business.email" type="email" class="w-full" /></UFormField
          ><UFormField label="Teléfono"><UInput v-model="form.business.phone" class="w-full" /></UFormField>
          <UFormField label="Dirección"><UInput v-model="form.business.address" class="w-full" /></UFormField
          ><UFormField label="Ciudad"><UInput v-model="form.business.city" class="w-full" /></UFormField>
          <UFormField label="País ISO"
            ><UInput v-model="form.business.country" maxlength="2" class="w-full" /></UFormField
          ><UFormField label="Zona horaria IANA"
            ><UInput v-model="form.business.timeZone" class="w-full"
          /></UFormField></div
      ></UCard>
      <UCard class="bg-default ring-default"
        ><h2 class="text-xl font-bold">Comercio</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Moneda"
            ><UInput v-model="form.commerce.currency" maxlength="3" class="w-full" /></UFormField
          ><UFormField label="Impuesto %"
            ><UInput
              v-model.number="form.commerce.taxRate"
              type="number"
              min="0"
              max="100"
              class="w-full" /></UFormField
          ><UCheckbox v-model="form.commerce.pricesIncludeTax" label="Precios incluyen impuesto" /></div
      ></UCard>
      <UCard class="bg-default ring-default"
        ><h2 class="text-xl font-bold">Inventario y alertas</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Ubicación predeterminada"
            ><UInput v-model="form.inventory.defaultLocationCode" class="w-full" /></UFormField
          ><UFormField
            label="Stock mínimo de alerta"
            description="Los productos con esta cantidad disponible o menos aparecen como stock bajo en el dashboard."
            ><UInput v-model.number="form.inventory.lowStockThreshold" type="number" min="0" class="w-full"
          /></UFormField>
          <UFormField
            label="Alerta de pedidos nuevos (horas)"
            description="Tiempo sin atención antes de destacar un pedido nuevo."
            ><UInput
              v-model.number="form.operations.orderAlertHours"
              type="number"
              min="1"
              class="w-full" /></UFormField
          ><UFormField
            label="Alerta de solicitudes nuevas (horas)"
            description="Tiempo sin atención antes de destacar una solicitud nueva."
            ><UInput v-model.number="form.operations.ticketAlertHours" type="number" min="1" class="w-full"
          /></UFormField></div
      ></UCard>
      <UCard class="bg-default ring-default"
        ><h2 class="text-xl font-bold">SEO</h2>
        <div class="mt-5 grid gap-4">
          <UFormField label="Nombre del sitio"
            ><UInput v-model="form.seo.siteName" class="w-full" /></UFormField
          ><UFormField label="Título predeterminado"
            ><UInput v-model="form.seo.defaultTitle" class="w-full" /></UFormField
          ><UFormField label="Descripción predeterminada"
            ><UTextarea v-model="form.seo.defaultDescription" class="w-full"
          /></UFormField></div
      ></UCard>
      <UCard class="bg-default ring-default lg:col-span-2"
        ><h2 class="text-xl font-bold">Redes sociales</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Facebook HTTPS"
            ><UInput v-model="form.social.facebook" class="w-full" /></UFormField
          ><UFormField label="Instagram HTTPS"
            ><UInput v-model="form.social.instagram" class="w-full"
          /></UFormField>
        </div>
        <p class="mt-4 text-xs text-muted">
          Este módulo no admite secretos, credenciales ni variables de infraestructura.
        </p></UCard
      >
    </div>
  </div>
</template>
