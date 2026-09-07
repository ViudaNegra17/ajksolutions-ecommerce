import { PERMISSIONS } from '#shared/constants/permissions'
import { ticketAssignmentSchema } from '#shared/schemas/ticket-admin.schema'
import { ticketService } from '../../../../services/ticket.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.TICKETS_ASSIGN)
  const body = await parseValidatedBody(event, ticketAssignmentSchema)
  return {
    success: true,
    data: await ticketService.assign(
      event,
      session.user.id,
      getRouterParam(event, 'id')!,
      body.assignedUserId,
      body.notes
    )
  }
})
