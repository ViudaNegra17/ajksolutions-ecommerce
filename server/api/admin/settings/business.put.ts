import { z } from 'zod'
import { PERMISSIONS } from '#shared/constants/permissions'
import { normalizePhone } from '#shared/utils/tickets'
import { auditService } from '../../../services/audit.service'
import { prisma } from '../../../utils/prisma'

const schema = z.object({ whatsapp: z.string().trim().min(8).max(30) })

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, PERMISSIONS.SETTINGS_MANAGE)
  const input = await parseValidatedBody(event, schema)
  const whatsapp = normalizePhone(input.whatsapp)
  if (!whatsapp) throw apiError(422, 'WHATSAPP_INVALID', 'El WhatsApp comercial no es válido.')
  const old = await prisma.setting.findUnique({ where: { key: 'business.whatsapp' } })
  const item = await prisma.setting.upsert({
    where: { key: 'business.whatsapp' },
    create: { key: 'business.whatsapp', value: whatsapp },
    update: { value: whatsapp }
  })
  await auditService.record(event, {
    userId: user.id,
    action: 'BUSINESS_WHATSAPP_UPDATED',
    entity: 'Setting',
    entityId: item.id,
    oldValues: { value: old?.value || null },
    newValues: { value: whatsapp }
  })
  return { success: true, data: { whatsapp } }
})
