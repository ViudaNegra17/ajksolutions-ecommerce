import { PERMISSIONS } from '#shared/constants/permissions'
import { supplierSchema } from '#shared/schemas/supplier.schema'
import { supplierService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SUPPLIERS_CREATE)
  const data = await supplierService.create(
    event,
    session.user.id,
    await parseValidatedBody(event, supplierSchema)
  )
  setResponseStatus(event, 201)
  return { success: true, data }
})
