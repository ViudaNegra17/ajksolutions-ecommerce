import { PERMISSIONS } from '#shared/constants/permissions'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.SETTINGS_MANAGE)
  const item = await prisma.setting.findUnique({ where: { key: 'business.whatsapp' } })
  return { success: true, data: { whatsapp: typeof item?.value === 'string' ? item.value : '' } }
})
