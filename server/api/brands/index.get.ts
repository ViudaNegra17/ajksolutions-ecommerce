import { publicCatalogService } from '../../services/public-catalog.service'

export default defineEventHandler(async () => ({
  success: true,
  data: await publicCatalogService.brands()
}))
