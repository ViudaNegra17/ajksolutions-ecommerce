import { PERMISSIONS } from '#shared/constants/permissions'
import { contentService } from '../../../services/operations.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.BANNERS_VIEW)
  return { success: true, data: await contentService.bannersAdmin() }
})
