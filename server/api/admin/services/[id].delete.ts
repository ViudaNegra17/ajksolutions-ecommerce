import { PERMISSIONS } from '#shared/constants/permissions'
import { serviceManagementService } from '../../../services/service-management.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SERVICES_DELETE)
  return {
    success: true,
    data: await serviceManagementService.remove(event, session.user.id, getRouterParam(event, 'id')!)
  }
})
