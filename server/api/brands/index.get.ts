import { publicCatalogService } from '../../services/public-catalog.service'

export default definePublicCachedHandler('brands', async () => ({
  success: true,
  data: await publicCatalogService.brands()
}))
