import 'dotenv/config'
import argon2 from 'argon2'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { PERMISSIONS, ROLE_CODES, type RoleCode } from '../shared/constants/permissions'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')

const required = [
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
  'SEED_ADMIN_FIRST_NAME',
  'SEED_ADMIN_LAST_NAME'
] as const
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} is required to seed the administrator`)
}
if (process.env.SEED_ADMIN_PASSWORD!.length < 12) {
  throw new Error('SEED_ADMIN_PASSWORD must contain at least 12 characters')
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const permissionNames: Record<string, string> = {
  [PERMISSIONS.DASHBOARD_VIEW]: 'Ver dashboard',
  [PERMISSIONS.CATALOG_MANAGE]: 'Gestionar catálogo',
  [PERMISSIONS.CATEGORIES_VIEW]: 'Ver categorías',
  [PERMISSIONS.CATEGORIES_CREATE]: 'Crear categorías',
  [PERMISSIONS.CATEGORIES_UPDATE]: 'Actualizar categorías',
  [PERMISSIONS.CATEGORIES_DELETE]: 'Eliminar categorías',
  [PERMISSIONS.BRANDS_VIEW]: 'Ver marcas',
  [PERMISSIONS.BRANDS_CREATE]: 'Crear marcas',
  [PERMISSIONS.BRANDS_UPDATE]: 'Actualizar marcas',
  [PERMISSIONS.BRANDS_DELETE]: 'Eliminar marcas',
  [PERMISSIONS.SUPPLIERS_VIEW]: 'Ver proveedores',
  [PERMISSIONS.SUPPLIERS_CREATE]: 'Crear proveedores',
  [PERMISSIONS.SUPPLIERS_UPDATE]: 'Actualizar proveedores',
  [PERMISSIONS.SUPPLIERS_DELETE]: 'Eliminar proveedores',
  [PERMISSIONS.ATTRIBUTES_VIEW]: 'Ver atributos',
  [PERMISSIONS.ATTRIBUTES_MANAGE]: 'Gestionar atributos',
  [PERMISSIONS.PRODUCTS_VIEW]: 'Ver productos',
  [PERMISSIONS.PRODUCTS_CREATE]: 'Crear productos',
  [PERMISSIONS.PRODUCTS_UPDATE]: 'Actualizar productos',
  [PERMISSIONS.PRODUCTS_DELETE]: 'Eliminar productos',
  [PERMISSIONS.INVENTORY_VIEW]: 'Ver inventario',
  [PERMISSIONS.INVENTORY_ADJUST]: 'Ajustar inventario',
  [PERMISSIONS.SERVICE_CATEGORIES_VIEW]: 'Ver categorías de servicios',
  [PERMISSIONS.SERVICE_CATEGORIES_CREATE]: 'Crear categorías de servicios',
  [PERMISSIONS.SERVICE_CATEGORIES_UPDATE]: 'Actualizar categorías de servicios',
  [PERMISSIONS.SERVICE_CATEGORIES_DELETE]: 'Eliminar categorías de servicios',
  [PERMISSIONS.SERVICES_VIEW]: 'Ver servicios',
  [PERMISSIONS.SERVICES_CREATE]: 'Crear servicios',
  [PERMISSIONS.SERVICES_UPDATE]: 'Actualizar servicios',
  [PERMISSIONS.SERVICES_DELETE]: 'Eliminar servicios',
  [PERMISSIONS.TICKETS_VIEW]: 'Ver tickets',
  [PERMISSIONS.TICKETS_CREATE]: 'Crear tickets',
  [PERMISSIONS.TICKETS_UPDATE]: 'Actualizar tickets',
  [PERMISSIONS.TICKETS_ASSIGN]: 'Asignar tickets',
  [PERMISSIONS.TICKETS_MANAGE_PRIORITY]: 'Gestionar prioridad de tickets',
  [PERMISSIONS.TICKETS_ADD_MESSAGE]: 'Agregar mensajes a tickets',
  [PERMISSIONS.CUSTOMERS_MANAGE]: 'Gestionar clientes',
  [PERMISSIONS.ORDERS_MANAGE]: 'Gestionar pedidos',
  [PERMISSIONS.ORDERS_VIEW]: 'Ver pedidos',
  [PERMISSIONS.ORDERS_UPDATE]: 'Actualizar pedidos',
  [PERMISSIONS.ORDERS_CANCEL]: 'Cancelar pedidos',
  [PERMISSIONS.ORDERS_MANAGE_STATUS]: 'Gestionar estado de pedidos',
  [PERMISSIONS.TICKETS_MANAGE]: 'Gestionar tickets',
  [PERMISSIONS.SETTINGS_MANAGE]: 'Gestionar configuración',
  [PERMISSIONS.SETTINGS_VIEW]: 'Ver configuración',
  [PERMISSIONS.SETTINGS_UPDATE]: 'Actualizar configuración',
  [PERMISSIONS.BANNERS_VIEW]: 'Ver banners',
  [PERMISSIONS.BANNERS_CREATE]: 'Crear banners',
  [PERMISSIONS.BANNERS_UPDATE]: 'Actualizar banners',
  [PERMISSIONS.BANNERS_DELETE]: 'Eliminar banners',
  [PERMISSIONS.PROMOTIONS_VIEW]: 'Ver promociones',
  [PERMISSIONS.PROMOTIONS_CREATE]: 'Crear promociones',
  [PERMISSIONS.PROMOTIONS_UPDATE]: 'Actualizar promociones',
  [PERMISSIONS.PROMOTIONS_DELETE]: 'Eliminar promociones',
  [PERMISSIONS.SECURITY_MANAGE]: 'Gestionar seguridad',
  [PERMISSIONS.AUDIT_VIEW]: 'Consultar auditoría'
}

const grants: Record<RoleCode, string[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  ADMIN: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.CATALOG_MANAGE,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.ORDERS_MANAGE,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.ORDERS_MANAGE_STATUS,
    PERMISSIONS.TICKETS_MANAGE,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.BANNERS_VIEW,
    PERMISSIONS.BANNERS_CREATE,
    PERMISSIONS.BANNERS_UPDATE,
    PERMISSIONS.BANNERS_DELETE,
    PERMISSIONS.PROMOTIONS_VIEW,
    PERMISSIONS.PROMOTIONS_CREATE,
    PERMISSIONS.PROMOTIONS_UPDATE,
    PERMISSIONS.PROMOTIONS_DELETE,
    PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.CATEGORIES_CREATE,
    PERMISSIONS.CATEGORIES_UPDATE,
    PERMISSIONS.CATEGORIES_DELETE,
    PERMISSIONS.BRANDS_VIEW,
    PERMISSIONS.BRANDS_CREATE,
    PERMISSIONS.BRANDS_UPDATE,
    PERMISSIONS.BRANDS_DELETE,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.SUPPLIERS_UPDATE,
    PERMISSIONS.SUPPLIERS_DELETE,
    PERMISSIONS.ATTRIBUTES_VIEW,
    PERMISSIONS.ATTRIBUTES_MANAGE,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.SERVICE_CATEGORIES_VIEW,
    PERMISSIONS.SERVICE_CATEGORIES_CREATE,
    PERMISSIONS.SERVICE_CATEGORIES_UPDATE,
    PERMISSIONS.SERVICE_CATEGORIES_DELETE,
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.SERVICES_CREATE,
    PERMISSIONS.SERVICES_UPDATE,
    PERMISSIONS.SERVICES_DELETE,
    PERMISSIONS.TICKETS_VIEW,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_UPDATE,
    PERMISSIONS.TICKETS_ASSIGN,
    PERMISSIONS.TICKETS_MANAGE_PRIORITY,
    PERMISSIONS.TICKETS_ADD_MESSAGE
  ],
  SALES: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.BANNERS_VIEW,
    PERMISSIONS.PROMOTIONS_VIEW,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.ORDERS_MANAGE,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_MANAGE_STATUS,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.BRANDS_VIEW,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.TICKETS_VIEW,
    PERMISSIONS.TICKETS_UPDATE,
    PERMISSIONS.TICKETS_ADD_MESSAGE
  ],
  SUPPORT: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.BANNERS_VIEW,
    PERMISSIONS.PROMOTIONS_VIEW,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.TICKETS_MANAGE,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.BRANDS_VIEW,
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.TICKETS_VIEW,
    PERMISSIONS.TICKETS_UPDATE,
    PERMISSIONS.TICKETS_ASSIGN,
    PERMISSIONS.TICKETS_MANAGE_PRIORITY,
    PERMISSIONS.TICKETS_ADD_MESSAGE
  ]
}

async function main() {
  const legacyPermissionCodes = [
    'licenses.manage',
    'licenses.view',
    'licenses.create',
    'licenses.update',
    'licenses.import',
    'licenses.reveal',
    'licenses.assign',
    'licenses.revoke',
    'digitalFulfillment.view',
    'digitalFulfillment.manage'
  ]
  await prisma.permission.deleteMany({ where: { code: { in: legacyPermissionCodes } } })

  const permissions = new Map<string, string>()
  for (const code of Object.values(PERMISSIONS)) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: { name: permissionNames[code] },
      create: { code, name: permissionNames[code] }
    })
    permissions.set(code, permission.id)
  }

  const roles = new Map<RoleCode, string>()
  for (const code of ROLE_CODES) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name: code.replace('_', ' ') },
      create: { code, name: code.replace('_', ' ') }
    })
    roles.set(code, role.id)

    const grantedPermissionIds = grants[code].map((permissionCode) => permissions.get(permissionCode)!)
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: grantedPermissionIds } }
    })

    for (const permissionCode of grants[code]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permissions.get(permissionCode)! } },
        update: {},
        create: { roleId: role.id, permissionId: permissions.get(permissionCode)! }
      })
    }
  }

  const email = process.env.SEED_ADMIN_EMAIL!.trim().toLowerCase()
  const passwordHash = await argon2.hash(process.env.SEED_ADMIN_PASSWORD!, { type: argon2.argon2id })
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      firstName: process.env.SEED_ADMIN_FIRST_NAME!,
      lastName: process.env.SEED_ADMIN_LAST_NAME!,
      passwordHash,
      active: true,
      deletedAt: null
    },
    create: {
      email,
      firstName: process.env.SEED_ADMIN_FIRST_NAME!,
      lastName: process.env.SEED_ADMIN_LAST_NAME!,
      passwordHash
    }
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: roles.get('SUPER_ADMIN')! } },
    update: {},
    create: { userId: user.id, roleId: roles.get('SUPER_ADMIN')! }
  })

  await prisma.inventoryLocation.upsert({
    where: { locationCode: 'LOC-000001' },
    update: { name: 'BODEGA PRINCIPAL', active: true, deletedAt: null },
    create: {
      locationCode: 'LOC-000001',
      name: 'BODEGA PRINCIPAL',
      description: 'Ubicación operativa inicial'
    }
  })

  const settings = [
    { key: 'business.name', value: 'AjkSolutionS', description: 'Nombre comercial' },
    { key: 'currency', value: 'USD', description: 'Moneda predeterminada' },
    { key: 'country', value: 'EC', description: 'País de operación' },
    {
      key: 'inventory.defaultLocationCode',
      value: 'LOC-000001',
      category: 'inventory',
      description: 'Código de la ubicación usada por checkout para reservar inventario'
    },
    {
      key: 'tax.defaultRate',
      value: process.env.SEED_DEFAULT_TAX_RATE || '0.00',
      category: 'tax',
      description: 'Tasa de impuesto predeterminada configurable'
    },
    {
      key: 'tax.pricesIncludeTaxDefault',
      value: false,
      category: 'tax',
      description: 'Indica si los precios incluyen impuesto por defecto'
    },
    {
      key: 'business.whatsapp',
      value: process.env.SEED_BUSINESS_WHATSAPP || '593999999999',
      category: 'business',
      description: 'Número comercial canónico para solicitudes por WhatsApp'
    },
    { key: 'business.email', value: '', category: 'business', description: 'Email comercial público' },
    { key: 'business.phone', value: '', category: 'business', description: 'Teléfono comercial público' },
    { key: 'business.address', value: '', category: 'business', description: 'Dirección comercial' },
    { key: 'business.city', value: '', category: 'business', description: 'Ciudad operativa' },
    {
      key: 'business.timeZone',
      value: 'America/Guayaquil',
      category: 'business',
      description: 'Zona horaria operativa IANA'
    },
    {
      key: 'inventory.lowStockThreshold',
      value: 3,
      category: 'inventory',
      description: 'Umbral inclusivo de stock disponible bajo'
    },
    {
      key: 'orders.newAlertHours',
      value: 24,
      category: 'operations',
      description: 'Antigüedad para alertar pedidos NEW con reserva'
    },
    {
      key: 'tickets.newAlertHours',
      value: 24,
      category: 'operations',
      description: 'Antigüedad para alertar tickets NEW'
    },
    { key: 'seo.siteName', value: 'AjkSolutionS', category: 'seo', description: 'Nombre público del sitio' },
    {
      key: 'seo.defaultTitle',
      value: 'AjkSolutionS e-Commerce',
      category: 'seo',
      description: 'Título SEO predeterminado'
    },
    {
      key: 'seo.defaultDescription',
      value: 'Productos tecnológicos y servicios profesionales.',
      category: 'seo',
      description: 'Descripción SEO predeterminada'
    },
    { key: 'social.facebook', value: '', category: 'social', description: 'URL pública de Facebook' },
    { key: 'social.instagram', value: '', category: 'social', description: 'URL pública de Instagram' }
  ]
  for (const setting of settings) {
    await prisma.setting.upsert({ where: { key: setting.key }, update: setting, create: setting })
  }

  const serviceCategory = await prisma.serviceCategory.upsert({
    where: { slug: 'soporte-tecnico' },
    update: { name: 'Soporte técnico', active: true, deletedAt: null },
    create: {
      name: 'Soporte técnico',
      slug: 'soporte-tecnico',
      description: 'Diagnóstico, mantenimiento y reparación de equipos tecnológicos.',
      icon: 'i-lucide-wrench',
      sortOrder: 1
    }
  })
  const service = await prisma.service.upsert({
    where: { slug: 'diagnostico-tecnico' },
    update: { categoryId: serviceCategory.id, active: true, deletedAt: null },
    create: {
      serviceCode: 'SRV-000001',
      name: 'Diagnóstico técnico',
      slug: 'diagnostico-tecnico',
      shortDescription: 'Evaluación inicial de equipos y recomendación de solución.',
      description: 'Cuéntanos el problema de tu equipo y prepararemos una evaluación técnica.',
      categoryId: serviceCategory.id,
      priceMode: 'FROM',
      price: '15.00',
      estimatedDuration: '1 a 2 días laborables',
      requiresDevice: true,
      featured: true,
      active: true
    }
  })
  await prisma.serviceFormField.upsert({
    where: { serviceId_key: { serviceId: service.id, key: 'problem_description' } },
    update: { active: true, deletedAt: null },
    create: {
      serviceId: service.id,
      key: 'problem_description',
      label: 'Describe el problema',
      type: 'TEXTAREA',
      required: true,
      sortOrder: 1,
      validationConfig: { minLength: 10, maxLength: 1000 }
    }
  })
  const serviceSequence = await prisma.codeSequence.findUnique({ where: { key: 'service' } })
  if (!serviceSequence) {
    await prisma.codeSequence.create({ data: { key: 'service', value: 1 } })
  } else if (serviceSequence.value < 1n) {
    await prisma.codeSequence.update({ where: { key: 'service' }, data: { value: 1 } })
  }
  await Promise.all(
    ['customer', 'ticket'].map((key) =>
      prisma.codeSequence.upsert({ where: { key }, update: {}, create: { key, value: 0 } })
    )
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error)
    await prisma.$disconnect()
    process.exitCode = 1
  })
