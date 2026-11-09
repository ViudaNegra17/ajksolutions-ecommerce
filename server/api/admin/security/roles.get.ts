import { PERMISSIONS } from '#shared/constants/permissions'
import { securityService } from '../../../services/security.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.SECURITY_MANAGE)
  return { success: true, data: await securityService.roles() }
})
