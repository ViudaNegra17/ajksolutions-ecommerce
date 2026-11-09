<script setup lang="ts">
import { PERMISSIONS, type RoleCode } from '#shared/constants/permissions'
import { securityUserCreateSchema, securityUserUpdateSchema } from '#shared/schemas/security.schema'
import type { SecurityUser, SecurityRole, SecurityUserPage } from '#shared/types/security'
import type { ApiSuccess } from '#shared/types/api'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Seguridad', robots: 'noindex, nofollow' })
const { user, fetch: refreshSession } = useUserSession()
const canManage = computed(
  () =>
    user.value?.roles.includes('SUPER_ADMIN') || user.value?.permissions.includes(PERMISSIONS.SECURITY_MANAGE)
)
if (!canManage.value) throw createError({ statusCode: 403, statusMessage: 'Acceso restringido a Seguridad' })

const adminRequest = useAdminRequest({ keys: ['admin:security:users'] })
const toast = useToast()
const searchInput = ref('')
const search = ref('')
const page = ref(1)
const open = ref(false)
const saving = ref(false)
const selected = ref<SecurityUser | null>(null)
const password = ref('')
const form = reactive({ firstName: '', lastName: '', email: '', active: true, roles: [] as RoleCode[] })
const formState = computed(() => (selected.value ? { ...form } : { ...form, password: password.value }))
const schema = computed(() => (selected.value ? securityUserUpdateSchema : securityUserCreateSchema))
const tabs = [
  { label: 'Usuarios', value: 'users', slot: 'users' },
  { label: 'Roles y permisos', value: 'roles', slot: 'roles' }
]
const {
  data: roleData,
  error: roleError,
  refresh: refreshRoles
} = await useFetch<ApiSuccess<SecurityRole[]>>('/api/admin/security/roles', { key: 'admin:security:roles' })
const roles = computed(() => roleData.value?.data || [])
const { data, status, error, refresh } = await useFetch<ApiSuccess<SecurityUserPage>>(
  '/api/admin/security/users',
  {
    key: 'admin:security:users',
    query: computed(() => ({ search: search.value, page: page.value, pageSize: 20 }))
  }
)
function findUsers() {
  page.value = 1
  search.value = searchInput.value.trim()
}
function edit(item?: SecurityUser) {
  selected.value = item || null
  password.value = ''
  Object.assign(
    form,
    item
      ? {
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          active: item.active,
          roles: item.roles.map((role) => role.code)
        }
      : { firstName: '', lastName: '', email: '', active: true, roles: [] }
  )
  open.value = true
}
async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const body = schema.value.parse(formState.value)
    await adminRequest(
      selected.value ? '/api/admin/security/users/' + selected.value.id : '/api/admin/security/users',
      {
        method: selected.value ? 'PUT' : 'POST',
        body
      }
    )
    if (selected.value?.id === user.value?.id) await refreshSession()
    toast.add({ title: selected.value ? 'Usuario actualizado' : 'Usuario creado', color: 'success' })
    password.value = ''
    open.value = false
  } catch (cause) {
    toast.add({ title: 'No se pudo guardar el usuario', description: uiErrorMessage(cause), color: 'error' })
  } finally {
    saving.value = false
  }
}
watch(open, (value) => {
  if (!value) password.value = ''
})
</script>

<template>
  <div>
    <AdminPageHeader title="Seguridad" description="Usuarios administrativos, roles y permisos efectivos.">
      <UButton
        label="Nuevo usuario"
        icon="i-lucide-user-plus"
        :disabled="!!roleError || !roles.length"
        @click="edit()"
      />
    </AdminPageHeader>
    <UAlert
      v-if="roleError"
      color="error"
      title="No se pudieron cargar los roles"
      class="mb-5"
      :actions="[{ label: 'Reintentar', onClick: () => refreshRoles() }]"
    />
    <UTabs :items="tabs" default-value="users" class="w-full">
      <template #users>
        <form class="my-5 flex flex-wrap items-end gap-3" role="search" @submit.prevent="findUsers">
          <UFormField label="Buscar usuarios" class="min-w-0 grow sm:max-w-md">
            <UInput
              v-model="searchInput"
              maxlength="120"
              placeholder="Nombre o correo"
              icon="i-lucide-search"
              class="w-full"
            />
          </UFormField>
          <UButton type="submit" label="Buscar" color="neutral" variant="outline" />
        </form>
        <UAlert
          v-if="error"
          color="error"
          title="No se pudieron cargar los usuarios"
          class="mb-5"
          :actions="[{ label: 'Reintentar', onClick: () => refresh() }]"
        />
        <UCard class="bg-default ring-default">
          <div v-if="status === 'pending'" role="status" aria-label="Cargando usuarios" class="space-y-3">
            <USkeleton v-for="index in 4" :key="index" class="h-12" />
          </div>
          <div
            v-else-if="data?.data.items.length"
            class="overflow-x-auto"
            tabindex="0"
            role="region"
            aria-label="Usuarios administrativos"
          >
            <table class="w-full min-w-170 text-left text-sm">
              <thead class="text-muted">
                <tr>
                  <th scope="col" class="p-3">Usuario</th>
                  <th scope="col" class="p-3">Roles</th>
                  <th scope="col" class="p-3">Estado</th>
                  <th scope="col" class="p-3">Último acceso</th>
                  <th scope="col" class="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in data.data.items" :key="item.id" class="border-t border-default">
                  <td class="p-3">
                    <p class="font-semibold">{{ item.firstName }} {{ item.lastName }}</p>
                    <p class="mt-1 text-muted">{{ item.email }}</p>
                  </td>
                  <td class="p-3">
                    <div class="flex max-w-64 flex-wrap gap-1">
                      <UBadge v-for="role in item.roles" :key="role.code" :label="role.name" variant="soft" />
                    </div>
                  </td>
                  <td class="p-3"><AdminStatusBadge :active="item.active" /></td>
                  <td class="p-3">
                    {{
                      item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString('es-EC') : 'Sin accesos'
                    }}
                  </td>
                  <td class="p-3 text-right">
                    <UButton
                      icon="i-lucide-pencil"
                      label="Editar"
                      color="neutral"
                      variant="ghost"
                      :aria-label="'Editar a ' + item.firstName + ' ' + item.lastName"
                      @click="edit(item)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <UEmpty v-else-if="!error" title="Sin usuarios" description="Prueba con otro nombre o correo." />
        </UCard>
        <UPagination
          v-if="data?.data.pagination.totalPages"
          v-model:page="page"
          :total="data.data.pagination.total"
          :items-per-page="20"
          class="mt-5"
        />
      </template>
      <template #roles>
        <p class="my-5 max-w-3xl leading-7 text-muted">
          Cada usuario recibe los permisos de sus roles asignados. Los permisos se validan en el servidor en
          cada operación protegida.
        </p>
        <div class="grid gap-5 lg:grid-cols-2">
          <UCard v-for="role in roles" :key="role.code" class="min-w-0 bg-default ring-default">
            <h2 class="text-lg font-bold">{{ role.name }}</h2>
            <p class="mt-1 font-mono text-sm text-primary">{{ role.code }}</p>
            <p v-if="role.description" class="mt-3 text-muted">{{ role.description }}</p>
            <details class="mt-4">
              <summary class="cursor-pointer font-medium">Ver {{ role.permissions.length }} permisos</summary>
              <ul class="mt-4 space-y-3">
                <li v-for="permission in role.permissions" :key="permission.code" class="break-words">
                  <p>{{ permission.name }}</p>
                  <code class="text-xs text-muted">{{ permission.code }}</code>
                </li>
              </ul>
            </details>
          </UCard>
        </div>
      </template>
    </UTabs>
    <AdminFormDialog v-model:open="open" :title="selected ? 'Editar usuario' : 'Nuevo usuario'">
      <UCard class="w-full max-w-xl bg-default ring-default">
        <h2 class="text-xl font-bold">{{ selected ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
        <UForm :schema="schema" :state="formState" class="mt-5 space-y-5" @submit="save">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Nombre" name="firstName" required
              ><UInput v-model="form.firstName" autocomplete="given-name" maxlength="100" class="w-full"
            /></UFormField>
            <UFormField label="Apellido" name="lastName" required
              ><UInput v-model="form.lastName" autocomplete="family-name" maxlength="100" class="w-full"
            /></UFormField>
            <UFormField label="Correo electrónico" name="email" required class="sm:col-span-2"
              ><UInput v-model="form.email" type="email" autocomplete="off" maxlength="320" class="w-full"
            /></UFormField>
            <UFormField
              v-if="!selected"
              label="Contraseña inicial"
              name="password"
              required
              description="Entre 12 y 128 caracteres."
              class="sm:col-span-2"
            >
              <UInput
                v-model="password"
                type="password"
                autocomplete="new-password"
                maxlength="128"
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField label="Roles" name="roles" required>
            <UCheckboxGroup
              v-model="form.roles"
              :items="roles.map((role) => ({ label: role.name, value: role.code }))"
              class="mt-2"
            />
          </UFormField>
          <UCheckbox v-model="form.active" label="Usuario activo" :disabled="selected?.id === user?.id" />
          <p v-if="selected?.id === user?.id" class="text-sm text-muted">
            Tu cuenta debe permanecer activa y conservar acceso a Seguridad.
          </p>
          <div class="flex flex-wrap justify-end gap-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="ghost"
              :disabled="saving"
              @click="open = false"
            />
            <UButton type="submit" label="Guardar usuario" :loading="saving" :disabled="!!roleError" />
          </div>
        </UForm>
      </UCard>
    </AdminFormDialog>
  </div>
</template>
