import { PERMISSIONS } from '#shared/constants/permissions'
import { paginationSchema } from '#shared/schemas/pagination.schema'
import { serviceManagementService } from '../../../services/service-management.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.SERVICES_VIEW)
  return {
    success: true,
    data: await serviceManagementService.list(parseValidatedQuery(event, paginationSchema))
  }
})
