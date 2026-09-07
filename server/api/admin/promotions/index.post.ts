import { PERMISSIONS } from '#shared/constants/permissions'
import { promotionSchema } from '#shared/schemas/promotion.schema'
import { contentService } from '../../../services/operations.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.PROMOTIONS_CREATE)
  const data = await contentService.savePromotion(
    event,
    session.user.id,
    await parseValidatedBody(event, promotionSchema)
  )
  setResponseStatus(event, 201)
  return { success: true, data }
})
