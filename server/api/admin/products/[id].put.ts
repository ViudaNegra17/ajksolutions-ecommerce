import { PERMISSIONS } from '#shared/constants/permissions'
import { productSchema } from '#shared/schemas/product.schema'
import { productService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.PRODUCTS_UPDATE)
  return {
    success: true,
    data: await productService.update(
      event,
      session.user.id,
      requireRouteId(event),
      await parseValidatedBody(event, productSchema)
    )
  }
})
