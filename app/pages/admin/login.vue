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

if (loggedIn.value) await navigateTo('/admin')

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
  <div class="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,.18),transparent_42%)]" />
    <UCard class="relative w-full max-w-md bg-slate-900/90 ring-white/10">
      <div class="mb-8 text-center">
        <div
          class="mx-auto grid size-12 place-items-center rounded-2xl bg-cyan-500 font-black text-slate-950"
        >
          A
        </div>
        <h1 class="mt-5 text-2xl font-bold">Acceso administrativo</h1>
        <p class="mt-2 text-sm text-slate-400">Gestiona AjkSolutionS e-Commerce de forma segura.</p>
      </div>
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
