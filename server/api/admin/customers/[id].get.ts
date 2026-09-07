import { PERMISSIONS } from '#shared/constants/permissions'
import { customerAdminService } from '../../../services/operations.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CUSTOMERS_MANAGE)
  return { success: true, data: await customerAdminService.detail(getRouterParam(event, 'id')!) }
})
