import { PERMISSIONS } from '#shared/constants/permissions'
import { catalogListQuerySchema } from '#shared/schemas/catalog-query.schema'
import { supplierService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.SUPPLIERS_VIEW)
  return {
    success: true,
    data: await supplierService.list(parseValidatedQuery(event, catalogListQuerySchema))
  }
})
