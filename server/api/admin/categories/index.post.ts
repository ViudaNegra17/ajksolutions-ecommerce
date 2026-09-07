import { PERMISSIONS } from '#shared/constants/permissions'
import { categorySchema } from '#shared/schemas/category.schema'
import { categoryService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, PERMISSIONS.CATEGORIES_CREATE)
  const data = await categoryService.create(
    event,
    session.user.id,
    await parseValidatedBody(event, categorySchema)
  )
  setResponseStatus(event, 201)
  return { success: true, data }
})
