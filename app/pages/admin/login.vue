<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { loginSchema, type LoginInput } from '#shared/schemas/auth.schema'

definePageMeta({ layout: false })
useSeoMeta({ title: 'Acceso administrativo', robots: 'noindex, nofollow' })

const route = useRoute()
const { loggedIn, fetch } = useUserSession()
const state = reactive<LoginInput>({ email: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')
const expirationMessage = computed(() =>
  route.query.reason === 'session-expired'
    ? 'Tu sesión administrativa expiró por inactividad. Inicia sesión nuevamente para continuar.'
    : ''
)

if (loggedIn.value) {
  try {
    const response = await useRequestFetch()<{ data: { user: unknown } }>('/api/auth/session', { retry: 0 })
    if (response.data.user) await navigateTo('/admin')
  } catch {
    // La sesión inválida se limpia en el servidor y el login permanece visible.
  }
}

async function submit(event: FormSubmitEvent<LoginInput>) {
  loading.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: event.data })
    await fetch()
    const target =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin')
        ? route.query.redirect
        : '/admin'
    await navigateTo(target)
  } catch (error: unknown) {
    const response = error as { data?: { data?: { error?: { message?: string } } } }
    errorMessage.value = response.data?.data?.error?.message || 'No fue posible iniciar sesión.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="grid min-h-screen place-items-center bg-default px-4 text-highlighted">
    <UCard class="relative w-full max-w-md bg-default ring-default">
      <div class="mb-8 text-center">
        <AppLogo class="mx-auto w-40" />
        <h1 class="mt-5 text-2xl font-bold">Acceso administrativo</h1>
        <p class="mt-2 text-sm text-muted">Gestiona AjkSolutionS e-Commerce de forma segura.</p>
      </div>
      <UAlert
        v-if="expirationMessage"
        class="mb-5"
        color="warning"
        variant="soft"
        icon="i-lucide-clock-alert"
        :description="expirationMessage"
      />
      <UAlert
        v-if="errorMessage"
        class="mb-5"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :description="errorMessage"
      />
      <UForm :schema="loginSchema" :state="state" class="space-y-5" @submit="submit">
        <UFormField label="Email" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            icon="i-lucide-mail"
            size="xl"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Contraseña" name="password" required>
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="current-password"
            icon="i-lucide-lock"
            size="xl"
            class="w-full"
          />
        </UFormField>
        <UButton type="submit" label="Ingresar" icon="i-lucide-log-in" size="xl" block :loading="loading" />
      </UForm>
      <UButton to="/" label="Volver al portal" color="neutral" variant="link" block class="mt-5" />
    </UCard>
  </div>
</template>
