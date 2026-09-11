import { publicSearchQuerySchema } from '#shared/schemas/public-catalog.schema'
import { publicCatalogService } from '../services/public-catalog.service'
import { enforcePublicAbuseRateLimit } from '../utils/public-abuse-rate-limit'

export default defineEventHandler(async (event) => {
  enforcePublicAbuseRateLimit(event, 'search')
  const query = parseValidatedQuery(event, publicSearchQuerySchema)
  return { success: true, data: await publicCatalogService.search(query.q, query.limit) }
})
