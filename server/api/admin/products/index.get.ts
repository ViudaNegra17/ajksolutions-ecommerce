import { PERMISSIONS } from '#shared/constants/permissions'
import { productListQuerySchema } from '#shared/schemas/catalog-query.schema'
import { productService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.PRODUCTS_VIEW)
  return {
    success: true,
    data: await productService.list(parseValidatedQuery(event, productListQuerySchema))
  }
})
