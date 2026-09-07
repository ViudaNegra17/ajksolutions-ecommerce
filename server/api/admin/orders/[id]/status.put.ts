import { PERMISSIONS } from '#shared/constants/permissions'
import { orderStatusUpdateSchema } from '#shared/schemas/order-admin.schema'
import { orderStatusService } from '../../../../services/order-status.service'

export default defineEventHandler(async (event) => {
  const body = await parseValidatedBody(event, orderStatusUpdateSchema)
  const permission =
    body.status === 'CANCELLED' ? PERMISSIONS.ORDERS_CANCEL : PERMISSIONS.ORDERS_MANAGE_STATUS
  const session = await requirePermission(event, permission)
  return {
    success: true,
    data: await orderStatusService.change(
      event,
      session.user.id,
      requireRouteId(event),
      body.status,
      body.notes
    )
  }
})
