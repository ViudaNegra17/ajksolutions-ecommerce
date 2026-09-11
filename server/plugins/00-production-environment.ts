import { validateProductionEnvironment } from '../../config/production-env'

export default defineNitroPlugin(() => {
  validateProductionEnvironment(process.env)
})
