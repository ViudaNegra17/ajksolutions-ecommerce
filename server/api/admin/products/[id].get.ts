import { PERMISSIONS } from '#shared/constants/permissions'
import { productService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.PRODUCTS_VIEW)
  return { success: true, data: await productService.get(requireRouteId(event)) }
})
