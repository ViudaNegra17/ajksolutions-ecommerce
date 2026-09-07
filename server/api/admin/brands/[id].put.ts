import { PERMISSIONS } from '#shared/constants/permissions'
import { brandSchema } from '#shared/schemas/brand.schema'
import { brandService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.BRANDS_UPDATE)
  return {
    success: true,
    data: await brandService.update(
      event,
      session.user.id,
      requireRouteId(event),
      await parseValidatedBody(event, brandSchema)
    )
  }
})
