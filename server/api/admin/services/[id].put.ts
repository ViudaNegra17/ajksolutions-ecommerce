import { PERMISSIONS } from '#shared/constants/permissions'
import { serviceSchema } from '#shared/schemas/service.schema'
import { serviceManagementService } from '../../../services/service-management.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SERVICES_UPDATE)
  return {
    success: true,
    data: await serviceManagementService.update(
      event,
      session.user.id,
      getRouterParam(event, 'id')!,
      await parseValidatedBody(event, serviceSchema)
    )
  }
})
