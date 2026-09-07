import { PERMISSIONS } from '#shared/constants/permissions'
import { serviceSchema } from '#shared/schemas/service.schema'
import { serviceManagementService } from '../../../services/service-management.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SERVICES_CREATE)
  const data = await serviceManagementService.create(
    event,
    session.user.id,
    await parseValidatedBody(event, serviceSchema)
  )
  setResponseStatus(event, 201)
  return { success: true, data }
})
