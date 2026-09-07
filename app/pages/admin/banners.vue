<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Banners', robots: 'noindex, nofollow' })
type Banner = {
  id: string
  code: string
  title: string
  subtitle: string | null
  description: string | null
  imageUrl: string
  mobileImageUrl: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  placement: 'HOME_HERO' | 'HOME_SECONDARY' | 'PRODUCTS_TOP'
  sortOrder: number
  active: boolean
  startsAt: string | null
  endsAt: string | null
}
const toast = useToast()
const open = ref(false)
const saving = ref(false)
const selected = ref<Banner | null>(null)
const form = reactive({
  title: '',
  subtitle: '',
  description: '',
  imageUrl: '',
  mobileImageUrl: '',
  ctaLabel: '',
  ctaUrl: '',
  placement: 'HOME_HERO' as Banner['placement'],
  sortOrder: 0,
  active: false,
  startsAt: '',
  endsAt: ''
})
const { data, status, error, refresh } = await useFetch<{ success: true; data: Banner[] }>(
  '/api/admin/banners'
)
function localDate(value: string | null) {
  return value ? value.slice(0, 16) : ''
}
function edit(item?: Banner) {
  selected.value = item || null
  Object.assign(
    form,
    item
      ? {
          ...item,
          subtitle: item.subtitle || '',
          description: item.description || '',
          mobileImageUrl: item.mobileImageUrl || '',
          ctaLabel: item.ctaLabel || '',
          ctaUrl: item.ctaUrl || '',
          startsAt: localDate(item.startsAt),
          endsAt: localDate(item.endsAt)
        }
      : {
          title: '',
          subtitle: '',
          description: '',
          imageUrl: '',
          mobileImageUrl: '',
          ctaLabel: '',
          ctaUrl: '',
          placement: 'HOME_HERO',
          sortOrder: 0,
          active: false,
          startsAt: '',
          endsAt: ''
        }
  )
  open.value = true
}
async function save() {
  saving.value = true
  try {
    await $fetch(selected.value ? `/api/admin/banners/${selected.value.id}` : '/api/admin/banners', {
      method: selected.value ? 'PUT' : 'POST',
      body: {
        ...form,
        subtitle: form.subtitle || null,
        description: form.description || null,
        mobileImageUrl: form.mobileImageUrl || null,
        ctaLabel: form.ctaLabel || null,
        ctaUrl: form.ctaUrl || null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null
      }
    })
    toast.add({ title: selected.value ? 'Banner actualizado' : 'Banner creado', color: 'success' })
    open.value = false
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo guardar el banner', description: String(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
async function remove(item: Banner) {
  if (!confirm(`¿Eliminar ${item.code}?`)) return
  await $fetch(`/api/admin/banners/${item.id}`, { method: 'DELETE' })
  toast.add({ title: 'Banner eliminado', color: 'success' })
  await refresh()
}
const placementLabels = {
  HOME_HERO: 'Hero de inicio',
  HOME_SECONDARY: 'Secundario de inicio',
  PRODUCTS_TOP: 'Cabecera de productos'
}
</script>

<template>
  <div>
    <AdminPageHeader title="Banners" description="Contenido visual programable con URLs HTTPS y texto plano.">
      <UButton label="Nuevo banner" icon="i-lucide-plus" @click="edit()" />
    </AdminPageHeader>
    <UAlert v-if="error" color="error" title="No se pudieron cargar los banners" />
    <UCard class="overflow-x-auto bg-slate-900/70 ring-white/10">
      <USkeleton v-if="status === 'pending'" class="h-48" />
      <table v-else class="w-full min-w-200 text-sm">
        <thead class="text-left text-slate-400">
          <tr>
            <th class="p-3">Preview</th>
            <th>Título</th>
            <th>Placement</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Estado</th>
            <th>Orden</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.data" :key="item.id" class="border-t border-white/10">
            <td class="p-3">
              <img :src="item.imageUrl" :alt="item.title" class="h-12 w-20 rounded object-cover" />
            </td>
            <td>
              <span class="font-medium">{{ item.title }}</span
              ><br /><span class="font-mono text-xs text-slate-500">{{ item.code }}</span>
            </td>
            <td>{{ placementLabels[item.placement] }}</td>
            <td>{{ item.startsAt ? new Date(item.startsAt).toLocaleString('es-EC') : 'Inmediato' }}</td>
            <td>{{ item.endsAt ? new Date(item.endsAt).toLocaleString('es-EC') : 'Sin fin' }}</td>
            <td><AdminStatusBadge :active="item.active" /></td>
            <td>{{ item.sortOrder }}</td>
            <td>
              <UButton
                icon="i-lucide-pencil"
                aria-label="Editar"
                variant="ghost"
                @click="edit(item)"
              /><UButton
                icon="i-lucide-trash-2"
                aria-label="Eliminar"
                color="error"
                variant="ghost"
                @click="remove(item)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <UEmpty v-if="status !== 'pending' && !data?.data.length" title="Sin banners" />
    </UCard>
    <div
      v-if="open"
      class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <UCard class="my-8 w-full max-w-3xl bg-slate-900 ring-white/10"
        ><h2 class="text-xl font-bold">{{ selected ? 'Editar banner' : 'Nuevo banner' }}</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UFormField label="Título" required><UInput v-model="form.title" class="w-full" /></UFormField>
          <UFormField label="Subtítulo"><UInput v-model="form.subtitle" class="w-full" /></UFormField>
          <UFormField label="Imagen HTTPS" required class="sm:col-span-2"
            ><UInput v-model="form.imageUrl" class="w-full"
          /></UFormField>
          <UFormField label="Imagen móvil HTTPS"
            ><UInput v-model="form.mobileImageUrl" class="w-full"
          /></UFormField>
          <UFormField label="Placement"
            ><select
              v-model="form.placement"
              class="w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2"
            >
              <option v-for="(label, key) in placementLabels" :key="key" :value="key">{{ label }}</option>
            </select></UFormField
          >
          <UFormField label="CTA"><UInput v-model="form.ctaLabel" class="w-full" /></UFormField
          ><UFormField label="Ruta o HTTPS"><UInput v-model="form.ctaUrl" class="w-full" /></UFormField>
          <UFormField label="Inicio"
            ><UInput v-model="form.startsAt" type="datetime-local" class="w-full" /></UFormField
          ><UFormField label="Fin"
            ><UInput v-model="form.endsAt" type="datetime-local" class="w-full"
          /></UFormField>
          <UFormField label="Orden"
            ><UInput v-model.number="form.sortOrder" type="number" min="0" class="w-full" /></UFormField
          ><UCheckbox v-model="form.active" label="Activo" />
          <UFormField label="Descripción" class="sm:col-span-2"
            ><UTextarea v-model="form.description" class="w-full"
          /></UFormField>
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
  </div>
</template>
