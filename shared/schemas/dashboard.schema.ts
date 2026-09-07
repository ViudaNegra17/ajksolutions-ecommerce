import { z } from 'zod'

export const dashboardQuerySchema = z.object({
  period: z.enum(['today', '7d', '30d', 'month']).default('30d')
})

export type DashboardPeriod = z.infer<typeof dashboardQuerySchema>['period']
