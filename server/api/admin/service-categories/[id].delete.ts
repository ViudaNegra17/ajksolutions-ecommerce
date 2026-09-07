import { PERMISSIONS } from '#shared/constants/permissions'
import { serviceCategoryManagementService } from '../../../services/service-management.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SERVICE_CATEGORIES_DELETE)
  return {
    success: true,
    data: await serviceCategoryManagementService.remove(event, session.user.id, getRouterParam(event, 'id')!)
  }
})
