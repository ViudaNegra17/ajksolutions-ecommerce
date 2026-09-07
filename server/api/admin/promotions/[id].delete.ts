import { PERMISSIONS } from '#shared/constants/permissions'
import { contentService } from '../../../services/operations.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.PROMOTIONS_DELETE)
  return {
    success: true,
    data: await contentService.deletePromotion(event, session.user.id, getRouterParam(event, 'id')!)
  }
})
