import { PERMISSIONS } from '#shared/constants/permissions'
import { inventoryAdjustmentSchema } from '#shared/schemas/inventory.schema'
import { inventoryService } from '../../../services/inventory.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.INVENTORY_ADJUST)
  return {
    success: true,
    data: await inventoryService.adjust(
      event,
      session.user.id,
      await parseValidatedBody(event, inventoryAdjustmentSchema)
    )
  }
})
