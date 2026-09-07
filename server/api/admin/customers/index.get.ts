import { PERMISSIONS } from '#shared/constants/permissions'
import { customerListQuerySchema } from '#shared/schemas/customer-admin.schema'
import { customerAdminService } from '../../../services/operations.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CUSTOMERS_MANAGE)
  return {
    success: true,
    data: await customerAdminService.list(parseValidatedQuery(event, customerListQuerySchema))
  }
})
