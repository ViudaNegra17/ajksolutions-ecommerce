import { PERMISSIONS } from '#shared/constants/permissions'
import { productSchema } from '#shared/schemas/product.schema'
import { productService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.PRODUCTS_CREATE)
  const data = await productService.create(
    event,
    session.user.id,
    await parseValidatedBody(event, productSchema)
  )
  setResponseStatus(event, 201)
  return { success: true, data }
})
