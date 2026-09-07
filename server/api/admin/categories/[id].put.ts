import { PERMISSIONS } from '#shared/constants/permissions'
import { categorySchema } from '#shared/schemas/category.schema'
import { categoryService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.CATEGORIES_UPDATE)
  return {
    success: true,
    data: await categoryService.update(
      event,
      session.user.id,
      requireRouteId(event),
      await parseValidatedBody(event, categorySchema)
    )
  }
})
