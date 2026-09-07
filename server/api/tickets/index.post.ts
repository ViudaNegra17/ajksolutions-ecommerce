import { publicTicketSchema } from '#shared/schemas/ticket.schema'
import { ticketService } from '../../services/ticket.service'
import { enforceTicketRateLimit } from '../../utils/ticket-rate-limit'

export default defineEventHandler(async (event) => {
  enforceTicketRateLimit(event)
  const data = await ticketService.create(event, await parseValidatedBody(event, publicTicketSchema))
  setResponseStatus(event, 201)
  return { success: true, data }
})
