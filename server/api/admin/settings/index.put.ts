import { PERMISSIONS } from '#shared/constants/permissions'
import { adminSettingsSchema } from '#shared/schemas/admin-settings.schema'
import { settingsService } from '../../../services/operations.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.SETTINGS_UPDATE)
  return {
    success: true,
    data: await settingsService.update(
      event,
      session.user.id,
      await parseValidatedBody(event, adminSettingsSchema)
    )
  }
})
