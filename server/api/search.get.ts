import { publicSearchQuerySchema } from '#shared/schemas/public-catalog.schema'
import { publicCatalogService } from '../services/public-catalog.service'

export default defineEventHandler(async (event) => {
  const query = parseValidatedQuery(event, publicSearchQuerySchema)
  return { success: true, data: await publicCatalogService.search(query.q, query.limit) }
})
