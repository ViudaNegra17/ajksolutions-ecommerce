import { PERMISSIONS } from '#shared/constants/permissions'
import { catalogListQuerySchema } from '#shared/schemas/catalog-query.schema'
import { brandService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.BRANDS_VIEW)
  return { success: true, data: await brandService.list(parseValidatedQuery(event, catalogListQuerySchema)) }
})
