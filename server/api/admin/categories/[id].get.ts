import { PERMISSIONS } from '#shared/constants/permissions'
import { categoryService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CATEGORIES_VIEW)
  return { success: true, data: await categoryService.get(requireRouteId(event)) }
})
