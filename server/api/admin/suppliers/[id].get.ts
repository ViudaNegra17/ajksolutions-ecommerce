import { PERMISSIONS } from '#shared/constants/permissions'
import { supplierService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.SUPPLIERS_VIEW)
  return { success: true, data: await supplierService.get(requireRouteId(event)) }
})
