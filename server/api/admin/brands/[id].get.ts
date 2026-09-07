import { PERMISSIONS } from '#shared/constants/permissions'
import { brandService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.BRANDS_VIEW)
  return { success: true, data: await brandService.get(requireRouteId(event)) }
})
