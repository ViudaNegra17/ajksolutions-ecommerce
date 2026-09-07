import { PERMISSIONS } from '#shared/constants/permissions'
import { settingsService } from '../../../services/operations.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.SETTINGS_VIEW)
  return { success: true, data: await settingsService.get() }
})
