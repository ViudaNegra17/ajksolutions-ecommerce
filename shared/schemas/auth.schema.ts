import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Ingresa un correo válido')),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128)
})

export type LoginInput = z.infer<typeof loginSchema>
