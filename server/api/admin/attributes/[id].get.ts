import { PERMISSIONS } from '#shared/constants/permissions'
import { attributeService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.ATTRIBUTES_VIEW)
  return { success: true, data: await attributeService.get(requireRouteId(event)) }
})
