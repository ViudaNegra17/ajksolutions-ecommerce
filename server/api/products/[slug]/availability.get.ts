import { publicAvailabilityQuerySchema } from '#shared/schemas/public-catalog.schema'
import { publicCatalogService } from '../../../services/public-catalog.service'
import { requirePublicSlug } from '../../../utils/public-route'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const query = parseValidatedQuery(event, publicAvailabilityQuerySchema)
  return {
    success: true,
    data: await publicCatalogService.availability(requirePublicSlug(event), query.variant)
  }
})
