import { PERMISSIONS } from '#shared/constants/permissions'
import { ticketMessageSchema } from '#shared/schemas/ticket-admin.schema'
import { ticketService } from '../../../../services/ticket.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.TICKETS_ADD_MESSAGE)
  const body = await parseValidatedBody(event, ticketMessageSchema)
  const data = await ticketService.addMessage(
    event,
    session.user.id,
    getRouterParam(event, 'id')!,
    body.message,
    body.internal
  )
  setResponseStatus(event, 201)
  return { success: true, data }
})
