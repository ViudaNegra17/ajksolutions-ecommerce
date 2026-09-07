import { PERMISSIONS } from '#shared/constants/permissions'
import { serviceCategoryManagementService } from '../../../services/service-management.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.SERVICE_CATEGORIES_VIEW)
  return { success: true, data: await serviceCategoryManagementService.get(getRouterParam(event, 'id')!) }
})
