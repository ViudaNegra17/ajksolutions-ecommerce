import { PERMISSIONS } from '#shared/constants/permissions'
import { securityUserQuerySchema } from '#shared/schemas/security.schema'
import { securityService } from '../../../../services/security.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.SECURITY_MANAGE)
  return {
    success: true,
    data: await securityService.list(parseValidatedQuery(event, securityUserQuerySchema))
  }
})
