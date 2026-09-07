import { PERMISSIONS } from '#shared/constants/permissions'
import { bannerSchema } from '#shared/schemas/banner.schema'
import { contentService } from '../../../services/operations.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.BANNERS_UPDATE)
  return {
    success: true,
    data: await contentService.saveBanner(
      event,
      session.user.id,
      await parseValidatedBody(event, bannerSchema),
      getRouterParam(event, 'id')!
    )
  }
})
