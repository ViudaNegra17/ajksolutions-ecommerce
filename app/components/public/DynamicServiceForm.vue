<script setup lang="ts">
import type { PublicServiceDetail, PublicTicketResult } from '#shared/types/services'

const props = defineProps<{ service: PublicServiceDetail }>()
const toast = useToast()
const startedAt = Date.now()
const saving = ref(false)
const result = ref<PublicTicketResult | null>(null)
const requestId = ref('')
const customer = reactive({
  firstName: '',
  lastName: '',
  documentType: '',
  documentNumber: '',
  email: '',
  phone: '',
  whatsapp: ''
})
const description = ref('')
const website = ref('')
const answers = reactive<Record<string, string | number | boolean | string[]>>({})

function ensureRequestId() {
  if (!requestId.value) requestId.value = crypto.randomUUID()
  return requestId.value
}

function selected(fieldId: string, optionId: string) {
  return Array.isArray(answers[fieldId]) && (answers[fieldId] as string[]).includes(optionId)
}

function toggle(fieldId: string, optionId: string, checked: boolean) {
  const current = Array.isArray(answers[fieldId]) ? [...(answers[fieldId] as string[])] : []
  answers[fieldId] = checked ? [...new Set([...current, optionId])] : current.filter((id) => id !== optionId)
}

function payloadAnswers() {
  return props.service.formFields.flatMap((field) => {
    const value = answers[field.id]
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) return []
    if (field.type === 'SELECT') return [{ fieldId: field.id, value: [String(value)] }]
    if (field.type === 'NUMBER') return [{ fieldId: field.id, value: Number(value) }]
    return [{ fieldId: field.id, value }]
  })
}

async function submit() {
  saving.value = true
  try {
    const response = await $fetch<{ success: true; data: PublicTicketResult }>('/api/tickets', {
      method: 'POST',
      body: {
        requestId: ensureRequestId(),
        serviceSlug: props.service.slug,
        customer,
        description: description.value || null,
        answers: payloadAnswers(),
        website: website.value,
        startedAt
      }
    })
    result.value = response.data
    toast.add({ title: `Ticket ${response.data.ticketCode} creado`, color: 'success' })
  } catch (cause) {
    toast.add({ title: 'No se pudo crear la solicitud', description: String(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function openWhatsApp() {
  if (!result.value) return
  if (result.value.handoffToken) {
    await $fetch('/api/tickets/whatsapp-opened', {
      method: 'POST',
      body: {
        ticketCode: result.value.ticketCode,
        handoffToken: result.value.handoffToken
      }
    }).catch(() => undefined)
  }
  window.open(result.value.whatsappUrl, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <UCard id="solicitar" class="bg-slate-900/70 ring-white/10">
    <template v-if="result">
      <div class="text-center">
        <span class="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/15"
          ><UIcon name="i-lucide-circle-check" class="size-9 text-emerald-400"
        /></span>
        <h2 class="mt-5 text-2xl font-black">Solicitud registrada</h2>
        <p class="mt-2 text-slate-300">
          Tu número de seguimiento es <strong>{{ result.ticketCode }}</strong
          >.
        </p>
        <p class="mt-2 text-sm text-slate-500">
          El ticket ya está guardado. Ahora puedes continuar la conversación por WhatsApp.
        </p>
        <UButton
          class="mt-6"
          size="xl"
          icon="i-lucide-message-circle"
          label="Continuar por WhatsApp"
          @click="openWhatsApp"
        />
      </div>
    </template>
    <form v-else class="space-y-6" novalidate @submit.prevent="submit">
      <div>
        <h2 class="text-2xl font-black">Solicitar este servicio</h2>
        <p class="mt-1 text-slate-400">Completa los datos para generar tu ticket de atención.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Nombres" required
          ><UInput
            v-model="customer.firstName"
            required
            minlength="2"
            class="w-full"
            autocomplete="given-name"
        /></UFormField>
        <UFormField label="Apellidos" required
          ><UInput
            v-model="customer.lastName"
            required
            minlength="2"
            class="w-full"
            autocomplete="family-name"
        /></UFormField>
        <UFormField label="Correo"
          ><UInput v-model="customer.email" type="email" class="w-full" autocomplete="email"
        /></UFormField>
        <UFormField label="WhatsApp" required
          ><UInput
            v-model="customer.whatsapp"
            type="tel"
            required
            minlength="8"
            class="w-full"
            placeholder="0999999999"
            autocomplete="tel"
        /></UFormField>
        <UFormField label="Teléfono"
          ><UInput v-model="customer.phone" type="tel" class="w-full"
        /></UFormField>
        <UFormField label="Documento"
          ><div class="grid grid-cols-[.7fr_1fr] gap-2">
            <UInput v-model="customer.documentType" placeholder="Cédula" /><UInput
              v-model="customer.documentNumber"
              placeholder="Número"
            /></div
        ></UFormField>
      </div>
      <UFormField label="Descripción general"
        ><UTextarea v-model="description" class="w-full" :rows="4" maxlength="5000"
      /></UFormField>
      <div v-for="field in service.formFields" :key="field.id">
        <UFormField
          :label="field.label"
          :description="field.description || undefined"
          :required="field.required"
        >
          <UTextarea
            v-if="field.type === 'TEXTAREA'"
            v-model="answers[field.id] as string"
            class="w-full"
            :required="field.required"
            :placeholder="field.placeholder || undefined"
          />
          <UInput
            v-else-if="['TEXT', 'EMAIL', 'PHONE', 'DATE', 'NUMBER'].includes(field.type)"
            v-model="answers[field.id] as string"
            class="w-full"
            :required="field.required"
            :type="
              field.type === 'EMAIL'
                ? 'email'
                : field.type === 'PHONE'
                  ? 'tel'
                  : field.type === 'DATE'
                    ? 'date'
                    : field.type === 'NUMBER'
                      ? 'number'
                      : 'text'
            "
            :placeholder="field.placeholder || undefined"
          />
          <select
            v-else-if="field.type === 'SELECT'"
            v-model="answers[field.id] as string"
            :required="field.required"
            class="w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2"
          >
            <option value="">Selecciona una opción</option>
            <option v-for="option in field.options" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
          <label v-else-if="field.type === 'BOOLEAN'" class="flex items-center gap-3"
            ><input v-model="answers[field.id] as boolean" type="checkbox" /> Sí</label
          >
          <div v-else class="space-y-2">
            <label v-for="option in field.options" :key="option.id" class="flex items-center gap-3"
              ><input
                type="checkbox"
                :checked="selected(field.id, option.id)"
                @change="toggle(field.id, option.id, ($event.target as HTMLInputElement).checked)"
              />{{ option.label }}</label
            >
          </div>
        </UFormField>
      </div>
      <input
        v-model="website"
        type="text"
        name="website"
        tabindex="-1"
        autocomplete="off"
        class="hidden"
        aria-hidden="true"
      />
      <UButton
        type="submit"
        block
        size="xl"
        icon="i-lucide-ticket-plus"
        label="Crear ticket de servicio"
        :loading="saving"
        :disabled="saving"
      />
      <p class="text-xs leading-5 text-slate-500">
        Al enviar, primero registramos tu solicitud y luego habilitamos el contacto por WhatsApp.
      </p>
    </form>
  </UCard>
</template>
