import { whatsappOpenedSchema } from '#shared/schemas/ticket.schema'
import { ticketService } from '../../services/ticket.service'

export default defineEventHandler(async (event) => {
  const { ticketCode, handoffToken } = await parseValidatedBody(event, whatsappOpenedSchema)
  await ticketService.markWhatsAppOpened(event, ticketCode, handoffToken)
  setResponseStatus(event, 204)
  return null
})
