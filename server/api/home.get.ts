import { publicCatalogService } from '../services/public-catalog.service'
import { publicServiceService } from '../services/public-service.service'
import { contentService } from '../services/operations.service'

export default defineEventHandler(async () => {
  const [catalog, services, banners] = await Promise.all([
    publicCatalogService.home(),
    publicServiceService.homeFeatured(),
    contentService.publicBanners()
  ])
  return { success: true, data: { ...catalog, services, banners } }
})
