import { publicServiceService } from '../../services/public-service.service'
import { requirePublicSlug } from '../../utils/public-route'

export default defineEventHandler(async (event) => ({
  success: true,
  data: await publicServiceService.get(requirePublicSlug(event))
}))
