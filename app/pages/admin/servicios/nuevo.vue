<script setup lang="ts">
const adminRequest = useAdminRequest()
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Nuevo servicio', robots: 'noindex, nofollow' })
type Category = { id: string; name: string }
const toast = useToast()
const saving = ref(false)
const { data } = await useFetch<{ success: true; data: Category[] }>('/api/admin/service-categories')
async function save(value: Record<string, unknown>) {
  saving.value = true
  try {
    const response = await adminRequest<{ success: true; data: { id: string } }>('/api/admin/services', {
      method: 'POST',
      body: value
    })
    toast.add({ title: 'Servicio creado', color: 'success' })
    await navigateTo(`/admin/servicios/${response.data.id}`)
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
      title="Nuevo servicio"
      description="Define la oferta y el formulario que verá el cliente."
    /><AdminServiceAdminForm :categories="data?.data || []" :loading="saving" @submit="save" />
  </div>
</template>
