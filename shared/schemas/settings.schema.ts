import { z } from 'zod'

export const settingSchema = z.object({
  key: z.string().min(2).max(150),
  value: z.json(),
  category: z.string().min(2).max(80).default('general'),
  description: z.string().max(255).optional()
})

export type SettingInput = z.infer<typeof settingSchema>
