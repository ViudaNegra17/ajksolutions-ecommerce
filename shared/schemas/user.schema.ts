import { z } from 'zod'

export const safeUserSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  roles: z.array(z.string()),
  permissions: z.array(z.string())
})

export type SafeUser = z.infer<typeof safeUserSchema>
