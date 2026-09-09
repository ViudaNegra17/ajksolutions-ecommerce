import { publicProductQuerySchema } from '#shared/schemas/public-catalog.schema'
import { publicCatalogService } from '../../services/public-catalog.service'

export default definePublicCachedHandler('products', async (event) => ({
  success: true,
  data: await publicCatalogService.list(parseValidatedQuery(event, publicProductQuerySchema))
}))
