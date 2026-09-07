import { PERMISSIONS } from '#shared/constants/permissions'
import { ticketService } from '../../../services/ticket.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.TICKETS_VIEW)
  return { success: true, data: await ticketService.get(getRouterParam(event, 'id')!) }
})
