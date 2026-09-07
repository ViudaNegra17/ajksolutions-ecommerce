import { PERMISSIONS } from '#shared/constants/permissions'
import { ticketStatusSchema } from '#shared/schemas/ticket-admin.schema'
import { ticketService } from '../../../../services/ticket.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.TICKETS_UPDATE)
  const body = await parseValidatedBody(event, ticketStatusSchema)
  return {
    success: true,
    data: await ticketService.changeStatus(
      event,
      session.user.id,
      getRouterParam(event, 'id')!,
      body.status,
      body.notes
    )
  }
})
