import { publicServiceService } from '../../services/public-service.service'

export default defineEventHandler(async () => {
  const data = await publicServiceService.list()
  return { success: true, data: data.categories }
})
