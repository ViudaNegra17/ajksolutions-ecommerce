import { PERMISSIONS } from '#shared/constants/permissions'
import { securityUserCreateSchema } from '#shared/schemas/security.schema'
import { securityService } from '../../../../services/security.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SECURITY_MANAGE)
  const input = await parseValidatedBody(event, securityUserCreateSchema)
  const user = await securityService.create(event, session.user.id, input)
  setResponseStatus(event, 201)
  return { success: true, data: user }
})
