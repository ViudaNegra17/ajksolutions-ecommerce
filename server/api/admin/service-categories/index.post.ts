import { PERMISSIONS } from '#shared/constants/permissions'
import { serviceCategorySchema } from '#shared/schemas/service-category.schema'
import { serviceCategoryManagementService } from '../../../services/service-management.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SERVICE_CATEGORIES_CREATE)
  const data = await serviceCategoryManagementService.create(
    event,
    session.user.id,
    await parseValidatedBody(event, serviceCategorySchema)
  )
  setResponseStatus(event, 201)
  return { success: true, data }
})
