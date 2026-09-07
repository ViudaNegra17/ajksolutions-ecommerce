import { PERMISSIONS } from '#shared/constants/permissions'
import { categoryService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.CATEGORIES_DELETE)
  return { success: true, data: await categoryService.remove(event, session.user.id, requireRouteId(event)) }
})
