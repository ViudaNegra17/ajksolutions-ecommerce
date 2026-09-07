import { PERMISSIONS } from '#shared/constants/permissions'
import { inventoryListQuerySchema } from '#shared/schemas/catalog-query.schema'
import { inventoryService } from '../../../services/inventory.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.INVENTORY_VIEW)
  return {
    success: true,
    data: await inventoryService.movements(parseValidatedQuery(event, inventoryListQuerySchema))
  }
})
