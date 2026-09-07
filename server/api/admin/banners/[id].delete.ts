import { PERMISSIONS } from '#shared/constants/permissions'
import { contentService } from '../../../services/operations.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.BANNERS_DELETE)
  return {
    success: true,
    data: await contentService.deleteBanner(event, session.user.id, getRouterParam(event, 'id')!)
  }
})
