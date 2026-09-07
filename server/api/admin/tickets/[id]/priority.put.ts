import { PERMISSIONS } from '#shared/constants/permissions'
import { ticketPrioritySchema } from '#shared/schemas/ticket-admin.schema'
import { ticketService } from '../../../../services/ticket.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.TICKETS_MANAGE_PRIORITY)
  const body = await parseValidatedBody(event, ticketPrioritySchema)
  return {
    success: true,
    data: await ticketService.changePriority(
      event,
      session.user.id,
      getRouterParam(event, 'id')!,
      body.priority,
      body.notes
    )
  }
})
