<script setup lang="ts">
import { ticketPriorities, ticketStatuses } from '#shared/schemas/ticket-admin.schema'

const adminRequest = useAdminRequest()

type Person = { firstName: string; lastName: string }
type TicketField = {
  id: string
  fieldLabel: string
  textValue: string | null
  numberValue: string | number | null
  booleanValue: boolean | null
  dateValue: string | null
  options: Array<{ optionLabel: string }>
}
type TicketDetail = {
  ticketCode: string
  subject: string
  source: string
  description: string | null
  status: string
  priority: string
  assignedUserId: string | null
  service: { name: string; serviceCode: string }
  customer: Person & { email: string | null; whatsapp: string | null; customerCode: string }
  fieldValues: TicketField[]
  messages: Array<{ id: string; message: string; createdAt: string; authorUser: Person | null }>
  history: Array<{ id: string; action: string; notes: string | null; createdAt: string; user: Person | null }>
}

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Detalle de ticket', robots: 'noindex, nofollow' })
const route = useRoute()
const toast = useToast()
const saving = ref(false)
const note = ref('')
const newMessage = ref('')
const { data, error, refresh } = await useFetch<{ success: true; data: TicketDetail }>(
  `/api/admin/tickets/${route.params.id}`
)
const { data: options } = await useFetch<{
  success: true
  data: { users: Array<{ id: string; firstName: string; lastName: string }> }
}>('/api/admin/tickets/options')
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Ticket no encontrado' })
const ticket = computed(() => data.value?.data)
const statusLabels: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_REVIEW: 'En revisión',
  WAITING_CUSTOMER: 'Esperando cliente',
  QUOTED: 'Cotizado',
  APPROVED: 'Aprobado',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado'
}
const priorityLabels: Record<string, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente'
}
function fieldValue(item: TicketField) {
  if (item.options.length) return item.options.map((value) => value.optionLabel).join(', ')
  if (item.textValue != null) return item.textValue
  if (item.numberValue != null) return item.numberValue
  if (item.booleanValue != null) return item.booleanValue ? 'Sí' : 'No'
  if (item.dateValue) return new Date(item.dateValue).toLocaleDateString('es-EC')
  return '—'
}
async function update(path: string, body: Record<string, unknown>, message: string) {
  saving.value = true
  try {
    await adminRequest(`/api/admin/tickets/${route.params.id}/${path}`, {
      method: 'PUT',
      body: { ...body, notes: note.value || null }
    })
    toast.add({ title: message, color: 'success' })
    note.value = ''
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo actualizar', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
async function addMessage() {
  if (!newMessage.value.trim()) return
  saving.value = true
  try {
    await adminRequest(`/api/admin/tickets/${route.params.id}/messages`, {
      method: 'POST',
      body: { message: newMessage.value, internal: true }
    })
    newMessage.value = ''
    toast.add({ title: 'Nota agregada', color: 'success' })
    await refresh()
  } catch (cause) {
    toast.add({ title: 'No se pudo agregar la nota', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="ticket">
    <AdminPageHeader :title="ticket.ticketCode" :description="ticket.subject"
      ><UButton to="/admin/tickets" label="Volver" icon="i-lucide-arrow-left" color="neutral" variant="ghost"
    /></AdminPageHeader>
    <div class="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div class="space-y-6">
        <UCard class="bg-default ring-default"
          ><h2 class="mb-4 text-xl font-bold">Solicitud</h2>
          <dl class="grid gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-sm text-muted">Servicio</dt>
              <dd class="font-bold">{{ ticket.service.name }} · {{ ticket.service.serviceCode }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Origen</dt>
              <dd>{{ adminLabel(ticket.source) }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-sm text-muted">Descripción</dt>
              <dd class="whitespace-pre-line">{{ ticket.description || '—' }}</dd>
            </div>
            <div v-for="item in ticket.fieldValues" :key="item.id">
              <dt class="text-sm text-muted">{{ item.fieldLabel }}</dt>
              <dd class="font-medium">{{ fieldValue(item) }}</dd>
            </div>
          </dl></UCard
        ><UCard class="bg-default ring-default"
          ><h2 class="mb-4 text-xl font-bold">Notas internas</h2>
          <div class="space-y-3">
            <div v-for="item in ticket.messages" :key="item.id" class="rounded-lg border border-default p-3">
              <p>{{ item.message }}</p>
              <p class="mt-2 text-xs text-muted">
                {{ item.authorUser ? `${item.authorUser.firstName} ${item.authorUser.lastName}` : 'Sistema' }}
                · {{ new Date(item.createdAt).toLocaleString('es-EC') }}
              </p>
            </div>
            <p v-if="!ticket.messages.length" class="text-muted">Sin notas.</p>
          </div>
          <UTextarea v-model="newMessage" class="mt-4 w-full" placeholder="Agregar nota interna" /><UButton
            class="mt-3"
            label="Agregar nota"
            :loading="saving"
            @click="addMessage" /></UCard
        ><UCard class="bg-default ring-default"
          ><h2 class="mb-4 text-xl font-bold">Historial</h2>
          <ol class="space-y-4">
            <li v-for="item in ticket.history" :key="item.id" class="border-l-2 border-primary pl-4">
              <p class="font-medium">{{ item.action }}</p>
              <p class="text-sm text-muted">{{ item.notes || 'Cambio registrado' }}</p>
              <p class="text-xs text-muted">
                {{ item.user ? `${item.user.firstName} ${item.user.lastName}` : 'Portal público' }} ·
                {{ new Date(item.createdAt).toLocaleString('es-EC') }}
              </p>
            </li>
          </ol></UCard
        >
      </div>
      <aside class="space-y-5">
        <UCard class="bg-default ring-default"
          ><h2 class="mb-4 text-xl font-bold">Cliente</h2>
          <p class="font-bold">{{ ticket.customer.firstName }} {{ ticket.customer.lastName }}</p>
          <p class="mt-2 text-sm text-muted">{{ ticket.customer.email || 'Sin correo' }}</p>
          <p class="text-sm text-muted">{{ ticket.customer.whatsapp }}</p>
          <p class="mt-3 font-mono text-xs text-primary">{{ ticket.customer.customerCode }}</p></UCard
        ><UCard class="space-y-4 bg-default ring-default"
          ><h2 class="text-xl font-bold">Gestión</h2>
          <UFormField label="Estado"
            ><select
              data-testid="ticket-status"
              :value="ticket.status"
              class="w-full rounded-md border border-default bg-default px-3 py-2"
              @change="
                update('status', { status: ($event.target as HTMLSelectElement).value }, 'Estado actualizado')
              "
            >
              <option v-for="item in ticketStatuses" :key="item" :value="item">
                {{ statusLabels[item] }}
              </option>
            </select></UFormField
          ><UFormField label="Prioridad"
            ><select
              data-testid="ticket-priority"
              :value="ticket.priority"
              class="w-full rounded-md border border-default bg-default px-3 py-2"
              @change="
                update(
                  'priority',
                  { priority: ($event.target as HTMLSelectElement).value },
                  'Prioridad actualizada'
                )
              "
            >
              <option v-for="item in ticketPriorities" :key="item" :value="item">
                {{ priorityLabels[item] }}
              </option>
            </select></UFormField
          ><UFormField label="Responsable"
            ><select
              data-testid="ticket-assignee"
              :value="ticket.assignedUserId || ''"
              class="w-full rounded-md border border-default bg-default px-3 py-2"
              @change="
                update(
                  'assignment',
                  { assignedUserId: ($event.target as HTMLSelectElement).value || null },
                  'Responsable actualizado'
                )
              "
            >
              <option value="">Sin asignar</option>
              <option v-for="item in options?.data.users" :key="item.id" :value="item.id">
                {{ item.firstName }} {{ item.lastName }}
              </option>
            </select></UFormField
          ><UFormField label="Nota del cambio"><UTextarea v-model="note" class="w-full" /></UFormField
        ></UCard>
      </aside>
    </div>
  </div>
</template>
