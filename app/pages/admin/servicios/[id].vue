<script setup lang="ts">
const adminRequest = useAdminRequest()
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Editar servicio', robots: 'noindex, nofollow' })
type Category = { id: string; name: string }
const route = useRoute()
const toast = useToast()
const saving = ref(false)
const [{ data: service, error }, { data: categories }] = await Promise.all([
  useFetch<{ success: true; data: Record<string, unknown> }>(`/api/admin/services/${route.params.id}`),
  useFetch<{ success: true; data: Category[] }>('/api/admin/service-categories')
])
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Servicio no encontrado' })
async function save(value: Record<string, unknown>) {
  saving.value = true
  try {
    await adminRequest(`/api/admin/services/${route.params.id}`, { method: 'PUT', body: value })
    toast.add({ title: 'Servicio actualizado', color: 'success' })
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
      title="Editar servicio"
      description="Actualiza la publicación sin alterar los snapshots históricos."
    /><AdminServiceAdminForm
      v-if="service?.data"
      :initial="service.data"
      :categories="categories?.data || []"
      :loading="saving"
      @submit="save"
    />
  </div>
</template>
