import { PERMISSIONS } from '#shared/constants/permissions'
import { catalogListQuerySchema } from '#shared/schemas/catalog-query.schema'
import { categoryService } from '../../../services/catalog.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CATEGORIES_VIEW)
  const query = getQuery(event)
  const data =
    query.tree === 'true'
      ? await categoryService.tree(query.active === 'true')
      : await categoryService.list(parseValidatedQuery(event, catalogListQuerySchema))
  return { success: true, data }
})
