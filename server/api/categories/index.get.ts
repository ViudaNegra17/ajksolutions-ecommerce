import { publicCatalogService } from '../../services/public-catalog.service'

export default definePublicCachedHandler('categories', async () => ({
  success: true,
  data: await publicCatalogService.categories()
}))
