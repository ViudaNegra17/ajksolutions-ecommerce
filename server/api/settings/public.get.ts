import { publicCatalogService } from '../../services/public-catalog.service'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return { success: true, data: await publicCatalogService.settings() }
})
