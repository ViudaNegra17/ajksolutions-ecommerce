import { PERMISSIONS } from '#shared/constants/permissions'
import { serviceCategorySchema } from '#shared/schemas/service-category.schema'
import { serviceCategoryManagementService } from '../../../services/service-management.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SERVICE_CATEGORIES_UPDATE)
  return {
    success: true,
    data: await serviceCategoryManagementService.update(
      event,
      session.user.id,
      getRouterParam(event, 'id')!,
      await parseValidatedBody(event, serviceCategorySchema)
    )
  }
})
