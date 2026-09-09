import { publicBannerQuerySchema } from '#shared/schemas/banner.schema'
import { contentService } from '../services/operations.service'

export default definePublicCachedHandler('banners', async (event) => {
  const query = parseValidatedQuery(event, publicBannerQuerySchema)
  return { success: true, data: await contentService.publicBanners(query.placement) }
})
