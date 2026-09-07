import { PERMISSIONS } from '#shared/constants/permissions'
import { productService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.PRODUCTS_DELETE)
  return { success: true, data: await productService.remove(event, session.user.id, requireRouteId(event)) }
})
