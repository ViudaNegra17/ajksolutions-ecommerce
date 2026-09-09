<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Catálogo administrativo', robots: 'noindex, nofollow' })

const modules = [
  {
    title: 'Productos',
    description: 'Precio, imágenes, atributos, variantes y proveedores.',
    icon: 'i-lucide-package',
    to: '/admin/catalogo/productos'
  },
  {
    title: 'Categorías',
    description: 'Jerarquía ilimitada y clasificación.',
    icon: 'i-lucide-tags',
    to: '/admin/catalogo/categorias'
  },
  {
    title: 'Marcas',
    description: 'Marcas comerciales y logotipos.',
    icon: 'i-lucide-badge',
    to: '/admin/catalogo/marcas'
  },
  {
    title: 'Proveedores',
    description: 'Contactos, costos y stock externo.',
    icon: 'i-lucide-truck',
    to: '/admin/catalogo/proveedores'
  },
  {
    title: 'Atributos',
    description: 'Especificaciones y opciones dinámicas.',
    icon: 'i-lucide-list-filter',
    to: '/admin/catalogo/atributos'
  },
  {
    title: 'Inventario',
    description: 'Stock propio, ajustes y movimientos.',
    icon: 'i-lucide-warehouse',
    to: '/admin/catalogo/inventario'
  }
]
</script>

<template>
  <div>
    <AdminPageHeader
      title="Catálogo"
      description="Gestiona los productos, las categorías y el inventario de tu tienda."
    />
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="module in modules" :key="module.to" class="bg-default ring-default">
        <UIcon :name="module.icon" class="size-8 text-primary" />
        <h2 class="mt-4 text-lg font-semibold">{{ module.title }}</h2>
        <p class="mt-2 min-h-12 text-sm text-muted">{{ module.description }}</p>
        <UButton :to="module.to" label="Administrar" variant="soft" block class="mt-5" />
      </UCard>
    </div>
  </div>
</template>
