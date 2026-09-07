import { publicProductQuerySchema } from '#shared/schemas/public-catalog.schema'
import { publicCatalogService } from '../../services/public-catalog.service'

export default defineEventHandler(async (event) => ({
  success: true,
  data: await publicCatalogService.list(parseValidatedQuery(event, publicProductQuerySchema))
}))
