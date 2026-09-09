import { z } from 'zod'
import { publicServiceService } from '../../services/public-service.service'

const querySchema = z.object({
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().max(180).optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional()
})

export default definePublicCachedHandler('services', async (event) => ({
  success: true,
  data: await publicServiceService.list(parseValidatedQuery(event, querySchema))
}))
