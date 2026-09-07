import { PERMISSIONS } from '#shared/constants/permissions'
import { ticketService } from '../../../services/ticket.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.TICKETS_VIEW)
  const [users, services] = await Promise.all([ticketService.eligibleUsers(), ticketService.serviceOptions()])
  return { success: true, data: { users, services } }
})
