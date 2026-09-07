import { publicCatalogService } from '../../services/public-catalog.service'
import { requirePublicSlug } from '../../utils/public-route'

export default defineEventHandler(async (event) => ({
  success: true,
  data: await publicCatalogService.get(requirePublicSlug(event))
}))
