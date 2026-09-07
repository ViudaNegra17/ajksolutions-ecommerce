import { PERMISSIONS } from '#shared/constants/permissions'
import { supplierService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SUPPLIERS_DELETE)
  return { success: true, data: await supplierService.remove(event, session.user.id, requireRouteId(event)) }
})
