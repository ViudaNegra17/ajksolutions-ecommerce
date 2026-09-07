import { PERMISSIONS } from '#shared/constants/permissions'
import { supplierSchema } from '#shared/schemas/supplier.schema'
import { supplierService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SUPPLIERS_UPDATE)
  return {
    success: true,
    data: await supplierService.update(
      event,
      session.user.id,
      requireRouteId(event),
      await parseValidatedBody(event, supplierSchema)
    )
  }
})
