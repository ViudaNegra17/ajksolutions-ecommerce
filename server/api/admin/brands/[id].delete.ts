import { PERMISSIONS } from '#shared/constants/permissions'
import { brandService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.BRANDS_DELETE)
  return { success: true, data: await brandService.remove(event, session.user.id, requireRouteId(event)) }
})
