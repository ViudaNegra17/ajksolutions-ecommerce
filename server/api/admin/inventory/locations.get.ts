import { PERMISSIONS } from '#shared/constants/permissions'
import { inventoryService } from '../../../services/inventory.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.INVENTORY_VIEW)
  return { success: true, data: await inventoryService.locations() }
})
