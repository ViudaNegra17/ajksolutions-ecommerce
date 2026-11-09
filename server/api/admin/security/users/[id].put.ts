import { PERMISSIONS } from '#shared/constants/permissions'
import { securityUserUpdateSchema, securityUserIdSchema } from '#shared/schemas/security.schema'
import { securityService } from '../../../../services/security.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SECURITY_MANAGE)
  const id = securityUserIdSchema.safeParse(requireRouteId(event))
  if (!id.success)
    throw apiError(422, 'SECURITY_INVALID_USER_ID', 'El identificador de usuario no es válido.')
  return {
    success: true,
    data: await securityService.update(
      event,
      session.user.id,
      id.data,
      await parseValidatedBody(event, securityUserUpdateSchema)
    )
  }
})
