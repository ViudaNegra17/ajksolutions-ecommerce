import { PERMISSIONS } from '#shared/constants/permissions'
import { dashboardQuerySchema } from '#shared/schemas/dashboard.schema'
import { dashboardService } from '../../services/operations.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.DASHBOARD_VIEW)
  const query = parseValidatedQuery(event, dashboardQuerySchema)
  return { success: true, data: await dashboardService.get(query.period) }
})
