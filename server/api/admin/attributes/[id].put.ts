import { PERMISSIONS } from '#shared/constants/permissions'
import { attributeSchema } from '#shared/schemas/attribute.schema'
import { attributeService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.ATTRIBUTES_MANAGE)
  return {
    success: true,
    data: await attributeService.update(
      event,
      session.user.id,
      requireRouteId(event),
      await parseValidatedBody(event, attributeSchema)
    )
  }
})
