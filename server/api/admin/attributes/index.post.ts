import { PERMISSIONS } from '#shared/constants/permissions'
import { attributeSchema } from '#shared/schemas/attribute.schema'
import { attributeService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.ATTRIBUTES_MANAGE)
  const data = await attributeService.create(
    event,
    session.user.id,
    await parseValidatedBody(event, attributeSchema)
  )
  setResponseStatus(event, 201)
  return { success: true, data }
})
