import { publicCatalogService } from '../../services/public-catalog.service'
import { requirePublicSlug } from '../../utils/public-route'

export default definePublicCachedHandler('categories', async (event) => ({
  success: true,
  data: await publicCatalogService.category(requirePublicSlug(event))
}))
