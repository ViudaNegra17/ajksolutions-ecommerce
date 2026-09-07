import { PERMISSIONS } from '#shared/constants/permissions'
import { brandSchema } from '#shared/schemas/brand.schema'
import { brandService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.BRANDS_CREATE)
  const data = await brandService.create(event, session.user.id, await parseValidatedBody(event, brandSchema))
  setResponseStatus(event, 201)
  return { success: true, data }
})
