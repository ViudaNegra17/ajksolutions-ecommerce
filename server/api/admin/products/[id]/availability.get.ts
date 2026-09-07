import { PERMISSIONS } from '#shared/constants/permissions'
import { inventoryService } from '../../../../services/inventory.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.PRODUCTS_VIEW)
  const variantId = typeof getQuery(event).variantId === 'string' ? String(getQuery(event).variantId) : null
  return { success: true, data: await inventoryService.availability(requireRouteId(event), variantId) }
})
