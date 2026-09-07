<script setup lang="ts">
import { PERMISSIONS, type PermissionCode } from '#shared/constants/permissions'

const { user, clear } = useUserSession()
const open = ref(false)
const hydrated = ref(false)
const sections = [
  {
    label: 'Banners',
    icon: 'i-lucide-gallery-horizontal',
    to: '/admin/banners',
    permission: PERMISSIONS.BANNERS_VIEW
  },
  {
    label: 'Promociones',
    icon: 'i-lucide-megaphone',
    to: '/admin/promociones',
    permission: PERMISSIONS.PROMOTIONS_VIEW
  },
  {
    label: 'Servicios',
    icon: 'i-lucide-wrench',
    to: '/admin/servicios',
    permission: PERMISSIONS.SERVICES_VIEW
  },
  {
    label: 'Categorías de servicio',
    icon: 'i-lucide-list-tree',
    to: '/admin/servicios/categorias',
    permission: PERMISSIONS.SERVICE_CATEGORIES_VIEW
  },
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/admin',
    permission: PERMISSIONS.DASHBOARD_VIEW
  },
  { label: 'Catálogo', icon: 'i-lucide-boxes', to: '/admin/catalogo', permission: PERMISSIONS.PRODUCTS_VIEW },
  {
    label: 'Productos',
    icon: 'i-lucide-package',
    to: '/admin/catalogo/productos',
    permission: PERMISSIONS.PRODUCTS_VIEW
  },
  {
    label: 'Categorías',
    icon: 'i-lucide-tags',
    to: '/admin/catalogo/categorias',
    permission: PERMISSIONS.CATEGORIES_VIEW
  },
  {
    label: 'Marcas',
    icon: 'i-lucide-badge',
    to: '/admin/catalogo/marcas',
    permission: PERMISSIONS.BRANDS_VIEW
  },
  {
    label: 'Proveedores',
    icon: 'i-lucide-truck',
    to: '/admin/catalogo/proveedores',
    permission: PERMISSIONS.SUPPLIERS_VIEW
  },
  {
    label: 'Atributos',
    icon: 'i-lucide-list-filter',
    to: '/admin/catalogo/atributos',
    permission: PERMISSIONS.ATTRIBUTES_VIEW
  },
  {
    label: 'Inventario',
    icon: 'i-lucide-warehouse',
    to: '/admin/catalogo/inventario',
    permission: PERMISSIONS.INVENTORY_VIEW
  },
  {
    label: 'Pedidos',
    icon: 'i-lucide-shopping-bag',
    to: '/admin/pedidos',
    permission: PERMISSIONS.ORDERS_VIEW
  },
  {
    label: 'Clientes',
    icon: 'i-lucide-users',
    to: '/admin/clientes',
    permission: PERMISSIONS.CUSTOMERS_MANAGE
  },
  {
    label: 'Tickets',
    icon: 'i-lucide-ticket-check',
    to: '/admin/tickets',
    permission: PERMISSIONS.TICKETS_VIEW
  },
  {
    label: 'Configuración',
    icon: 'i-lucide-settings',
    to: '/admin/configuracion',
    permission: PERMISSIONS.SETTINGS_VIEW
  },
  {
    label: 'Seguridad',
    icon: 'i-lucide-shield',
    to: '/admin/seguridad',
    permission: PERMISSIONS.SECURITY_MANAGE
  }
]
const visibleSections = computed(() =>
  user.value?.roles.includes('SUPER_ADMIN')
    ? sections
    : sections.filter((section) => user.value?.permissions.includes(section.permission as PermissionCode))
)

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/admin/login')
}

onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <div
    class="min-h-screen bg-slate-950 text-white lg:grid lg:grid-cols-[260px_1fr]"
    data-admin-app
    :data-hydrated="hydrated ? 'true' : 'false'"
  >
    <aside
      :class="[
        'fixed inset-y-0 z-40 w-65 border-r border-white/10 bg-slate-950 p-4 transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="mb-6 flex items-center justify-between px-2">
        <NuxtLink to="/admin" class="font-bold"><span class="text-cyan-400">Ajk</span> Admin</NuxtLink>
        <UButton class="lg:hidden" icon="i-lucide-x" color="neutral" variant="ghost" @click="open = false" />
      </div>
      <nav class="space-y-1" aria-label="Administración">
        <UButton
          v-for="item in visibleSections"
          :key="item.to"
          :to="item.to"
          :label="item.label"
          :icon="item.icon"
          color="neutral"
          variant="ghost"
          block
          class="justify-start"
          @click="open = false"
        />
      </nav>
    </aside>
    <div class="min-w-0">
      <header class="flex h-16 items-center justify-between border-b border-white/10 px-4 sm:px-6">
        <UButton
          class="lg:hidden"
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          @click="open = true"
        />
        <div class="ml-auto flex items-center gap-3">
          <div class="hidden text-right sm:block">
            <p class="text-sm font-medium">{{ user?.firstName }} {{ user?.lastName }}</p>
            <p class="text-xs text-slate-400">
              {{ user?.roles.join(', ') }}
            </p>
          </div>
          <UButton label="Salir" icon="i-lucide-log-out" color="neutral" variant="soft" @click="logout" />
        </div>
      </header>
      <main class="p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
