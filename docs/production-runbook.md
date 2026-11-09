# Runbook operativo de producción — Fase 9

Fecha de revisión 2026-11-08. Estado operativo inicial verificado y cierre de V1 en curso.

## Entorno identificado

- Portal y origen canónico vigente `https://ajksolutions-ecommerce-neon.vercel.app`.
- Repositorio `ViudaNegra17/ajksolutions-ecommerce`, rama `main`.
- Vercel deployment `dpl_8mPXuEbmgrwviwSp9cRDXrkYA9Td`, estado observado `READY`.
- SHA desplegado `5636093f1d9ed4536525f9fffeab51f21e4436ab`.
- Framework Vercel `nuxtjs`, Node `24.x`, región de funciones observada `iad1`.
- PostgreSQL instalado localmente para desarrollo y pruebas. Neon productivo informado por el usuario, con configuración privada pendiente de revisión.

Los metadatos seleccionados del despliegue están en [la evidencia Vercel](phase9/vercel-deployment.json). La configuración de Neon debe verificarse en su consola o mediante consultas autorizadas de solo lectura antes de confirmar su versión, región, SSL y pooling.

## Variables de entorno

Configurar por entorno, utilizando el almacén de secretos de la plataforma.

| Variable                                           | Uso y validación                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                     | Conexión PostgreSQL privada. Confirmar destino y configuración SSL/pooling de Neon antes de migrar |
| `NUXT_SESSION_PASSWORD`                            | Secreto de sesión aleatorio e independiente, al menos 32 caracteres                                |
| `NUXT_CHECKOUT_SIGNING_SECRET`                     | Firma de checkout, aleatorio e independiente, al menos 32 caracteres                               |
| `NUXT_ORDER_HANDOFF_SECRET`                        | Firma de handoff, aleatorio e independiente, al menos 32 caracteres                                |
| `NUXT_PUBLIC_APP_URL`                              | Origen HTTPS público vigente, sin credenciales ni path                                             |
| `SEED_ADMIN_*`                                     | Aprovisionamiento inicial controlado y bases de prueba                                             |
| `SEED_DEFAULT_TAX_RATE` / `SEED_BUSINESS_WHATSAPP` | Datos de seed sujetos a definición comercial                                                       |
| `R2_*`, `SENTRY_DSN`                               | Opcionales documentadas en `.env.example`, verificar su utilización efectiva                       |

`config/production-env.ts` valida las variables críticas durante el arranque productivo. Revisar los nombres faltantes cuando el runtime indique configuración incompleta. Mantener credenciales y valores privados fuera de tickets, capturas y logs compartidos.

## Preflight y deploy controlado

1. Registrar SHA candidato, branch, diff y estado del árbol de trabajo.
2. Revisar el informe de QA y resolver P0/P1 antes de liberar.
3. Confirmar CI verde para el SHA exacto y obtener respaldo recuperable según el [runbook de backup](backup-restore-runbook.md).
4. Ejecutar `pnpm install --frozen-lockfile`, `pnpm exec prisma format --check`, `pnpm exec prisma validate` y `pnpm db:generate`.
5. Ejecutar lint, formato, tipos, Vitest, E2E, visuales y build con entorno de QA aislado. Los E2E e integración crean registros, por lo que su `DATABASE_URL` debe apuntar a una base temporal.
6. Revisar `prisma migrate status` en el destino autorizado. Aplicar `pnpm db:deploy` dentro del procedimiento de despliegue y con respaldo previo.
7. Publicar el SHA aprobado y esperar el resultado de Vercel.
8. Registrar ID del deployment y verificar alias, runtime y SHA con `vercel inspect https://ajksolutions-ecommerce-neon.vercel.app`.
9. Ejecutar smoke posterior y registrar resultados.

En esta entrega inicial se registró el deployment existente. La publicación de las correcciones quedará asociada al cierre y sus controles.

## Seed y administrador

El seed se utiliza de forma automática en bases temporales de QA con credenciales efímeras. El aprovisionamiento productivo debe revisar primero el contenido de `prisma/seed.ts`, el destino de conexión y las cuentas existentes.

Operación administrativa en `/admin/login`. Ante fallos de acceso, revisar usuario activo, permisos efectivos, sesión, expiración absoluta e inactividad. La suite local cubre revocación y logout. La comprobación autenticada en producción requiere una cuenta de prueba controlada y registro de sus cambios.

## Health y smoke

Ejecutar `pnpm smoke:production -- https://ajksolutions-ecommerce-neon.vercel.app` con entorno limpio, comprobando que `NUXT_PUBLIC_APP_URL` también tenga el destino deseado. El script prioriza esa variable sobre el argumento.

Verificar HTTP 200 y tipo de contenido esperado en Home, catálogo, servicios, login, robots y sitemap. Liveness y readiness deben devolver `{"status":"ok"}`. Readiness ejecuta `SELECT 1` mediante Prisma.

Comprobar también canonical, una ficha activa de producto y una de servicio. Para una validación comercial productiva completa, utilizar registros identificables y limpieza acordada. Los enlaces WhatsApp pueden validarse sin enviar mensajes.

## Logs y diagnóstico

- Correlacionar `x-request-id` con los logs de aplicación.
- Conservar `x-vercel-id` para soporte de la invocación. El SHA se obtiene de metadatos del deployment.
- Revisar Runtime Logs de Vercel por ruta, método, status, duración y error.
- Para 503 en readiness, comprobar conexión, disponibilidad, SSL y límites de PostgreSQL.
- Para `FUNCTION_INVOCATION_FAILED`, obtener el error del runtime y corregir su causa demostrada.
- Para `DEPLOYMENT_NOT_FOUND`, comprobar el alias vigente. La URL antigua sin `-neon` devolvió ese error durante esta auditoría.
- Para imágenes externas fallidas, revisar respuesta HTTP, tipo MIME y restricciones del origen. Se reprodujo `ERR_BLOCKED_BY_ORB` en la imagen de Diagnóstico técnico.
- Ante inicio lento, comparar primera solicitud y solicitudes posteriores. Registrar contexto de navegador, red y estado del proceso.
- La deprecación pg sobre consultas concurrentes debe investigarse con una traza que identifique su origen.

## Cache y serverless

La configuración actual usa almacenamiento `public-cache` en memoria. Cache e invalidaciones deben revisarse considerando que Vercel puede ejecutar varias instancias. Verificar también el alcance efectivo de los límites de peticiones antes de certificar seguridad operacional.

La revisión completa de invalidación entre instancias y la observación de logs privados quedan pendientes de la fase 9.

## Rollback

1. Registrar versión defectuosa, request IDs, impacto y cambios de schema.
2. Seleccionar un deployment anterior validado y comprobar compatibilidad con el schema actual.
3. Reasignar producción mediante el procedimiento de rollback de Vercel autorizado.
4. Si hay incompatibilidad de datos/schema, decidir forward-fix o restauración aislada según el runbook de backup.
5. Repetir health y smoke, y documentar resultado.

## Pendientes operativos

- CI accesible y verde del candidato final.
- Inventario privado de variables Vercel, configuración Neon y logs del runtime.
- Verificación de respaldo y restauración del entorno productivo actual.
- Contacto responsable, alertas, retención de logs y objetivos operativos acordados.
- Políticas comerciales y legales aprobadas por el negocio.

Consultar [el baseline](phase9-baseline.md) y [el informe de QA](phase9-qa-final-report.md) para el estado de la auditoría.
