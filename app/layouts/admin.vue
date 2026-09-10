<script setup lang="ts">
import { PERMISSIONS, type PermissionCode } from '#shared/constants/permissions'

const { user, clear } = useUserSession()
const sidebarCollapsed = ref(false)
const hydrated = ref(false)
const route = useRoute()
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
const groups = computed(() =>
  [
    { label: 'Resumen', names: ['Dashboard'] },
    { label: 'Operación', names: ['Pedidos', 'Tickets', 'Clientes'] },
    {
      label: 'Catálogo',
      names: ['Productos', 'Categorías', 'Marcas', 'Atributos', 'Inventario', 'Proveedores']
    },
    { label: 'Servicios', names: ['Servicios', 'Categorías de servicio'] },
    { label: 'Contenido', names: ['Banners', 'Promociones'] },
    { label: 'Sistema', names: ['Configuración', 'Seguridad'] }
  ]
    .map((group) => ({
      label: group.label,
      items: group.names.flatMap((name) => visibleSections.value.filter((item) => item.label === name))
    }))
    .filter((group) => group.items.length)
)
const activeSection = computed(() =>
  visibleSections.value
    .filter((section) => route.path === section.to || route.path.startsWith(`${section.to}/`))
    .sort((left, right) => right.to.length - left.to.length)
    .at(0)
)
const navbarTitle = computed(() => activeSection.value?.label || 'Administración')
const isAdminSectionRoot = computed(() => activeSection.value?.to === route.path)

provide('adminSectionRoot', isAdminSectionRoot)

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
    class="min-h-screen bg-default text-highlighted"
    data-admin-app
    :data-hydrated="hydrated ? 'true' : 'false'"
  >
    <a href="#admin-content" class="skip-link">Saltar al contenido</a>
    <UDashboardGroup storage-key="ajk-admin-dashboard-shell" unit="px" :persistent="true">
      <UDashboardSidebar
        id="admin"
        v-model:collapsed="sidebarCollapsed"
        data-testid="admin-sidebar"
        collapsible
        resizable
        class="bg-elevated/25"
        :min-size="220"
        :max-size="340"
        :default-size="260"
        :collapsed-size="72"
        :menu="{
          title: 'Administración',
          description: 'Operación y configuración de AJKSolutionS'
        }"
      >
        <template #header="{ collapsed }">
          <NuxtLink
            to="/admin"
            aria-label="AJKSolutionS, administración"
            class="flex w-full items-center justify-center overflow-hidden"
          >
            <AppLogo :class="collapsed ? 'max-w-10' : ''" />
          </NuxtLink>
        </template>

        <template #default="{ collapsed }">
          <AdminNavigation :groups="groups" :collapsed="collapsed" />
        </template>
      </UDashboardSidebar>

      <UDashboardPanel id="admin-panel" :ui="{ body: 'bg-muted p-4 sm:p-6 lg:p-8' }">
        <template #header>
          <UDashboardNavbar :title="navbarTitle" data-testid="admin-navbar">
            <template #toggle>
              <UDashboardSidebarToggle
                data-testid="admin-sidebar-toggle"
                side="left"
                color="neutral"
                variant="ghost"
              />
            </template>
            <template #leading>
              <UDashboardSidebarCollapse data-testid="admin-sidebar-collapse" />
            </template>
            <template #right>
              <div class="hidden text-right sm:block">
                <p class="text-sm font-medium">{{ user?.firstName }} {{ user?.lastName }}</p>
                <p class="text-xs text-muted">{{ user?.roles.join(', ') }}</p>
              </div>
              <UButton label="Salir" icon="i-lucide-log-out" color="neutral" variant="soft" @click="logout" />
            </template>
          </UDashboardNavbar>
        </template>

        <template #body>
          <main id="admin-content" class="min-h-full min-w-0">
            <slot />
          </main>
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
  </div>
</template>
