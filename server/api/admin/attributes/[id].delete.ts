import { PERMISSIONS } from '#shared/constants/permissions'
import { attributeService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.ATTRIBUTES_MANAGE)
  return { success: true, data: await attributeService.remove(event, session.user.id, requireRouteId(event)) }
})
