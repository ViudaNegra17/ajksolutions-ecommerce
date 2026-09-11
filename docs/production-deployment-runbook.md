# Runbook de despliegue a producción

Este procedimiento es vendor-neutral y no presupone Docker, PM2, Vercel ni otro proveedor. V1 requiere una sola instancia mientras cache y rate limits continúen en memoria local.

## Preflight

1. Seleccionar commit y tag candidato, por ejemplo `v1.0.0-rc.1`; no publicar release automáticamente.
2. Confirmar que GitHub Actions y `pnpm release:check` están verdes sobre ese commit.
3. Aprovisionar Node 24+, pnpm 11.24, PostgreSQL compatible y HTTPS terminado por la plataforma/proxy.
4. Configurar `DATABASE_URL`, `NUXT_SESSION_PASSWORD`, `NUXT_CHECKOUT_SIGNING_SECRET`, `NUXT_ORDER_HANDOFF_SECRET` y `NUXT_PUBLIC_APP_URL`. Los tres secretos deben ser aleatorios, diferentes y de al menos 32 caracteres. La URL pública debe ser HTTPS, sin localhost, path ni credenciales.
5. Configurar opcionales (`WHATSAPP_NUMBER`, R2) solo si el negocio los usa. No instalar analytics ni crear banner de consentimiento sin tracking no esencial.
6. Confirmar almacenamiento de logs, rotación, backup programado y acceso operativo.

## Deploy

1. Registrar commit/tag y hora de inicio.
2. Ejecutar backup previo según `backup-restore-runbook.md` y verificar checksum.
3. `pnpm install --frozen-lockfile`.
4. `pnpm exec prisma validate` y `pnpm db:generate`.
5. `pnpm db:deploy` (nunca `migrate dev` en producción).
6. `pnpm build`.
7. Arrancar el artefacto `.output/server/index.mjs` con las variables inyectadas por el entorno.
8. Confirmar `GET /api/health/live` = 200 `{"status":"ok"}`.
9. Confirmar `GET /api/health/ready` = 200 `{"status":"ok"}`; si devuelve 503, retirar tráfico y resolver DB.
10. Ejecutar `pnpm smoke:production -- https://dominio-real` desde un host autorizado.

## Smoke funcional controlado

- Abrir home, catálogo, detalle de producto y servicios; revisar imágenes y CSP en consola.
- Validar `robots.txt`, `sitemap.xml`, canonical HTTPS y JSON-LD parseable.
- Iniciar sesión admin, navegar sidebar y confirmar expiración/revalidación sin debilitar la política 8 h/30 min.
- PHYSICAL: producto, variante, carrito, preview, disponibilidad, Order, reserva y WhatsApp con fixture controlado.
- DIGITAL: Buy Now, cantidad 1, sin Address, shipping 0, Order y WhatsApp; no existe key interna.
- SERVICE: formulario dinámico, Customer, Ticket, snapshots y WhatsApp.
- Revisar logs por `requestId`, 5xx, errores de CSP y ausencia de secretos.

## Rollback

1. Retirar tráfico de la versión defectuosa y preservar logs/request IDs.
2. Si no hubo cambio de schema o el anterior es compatible, reactivar el artefacto/tag previo.
3. Si hubo migración incompatible, no ejecutar rollback SQL improvisado: aplicar forward-fix o restaurar en una base nueva siguiendo el runbook.
4. Repetir liveness, readiness y smoke antes de devolver tráfico.
5. Documentar causa, impacto, tiempos y datos restaurados.

## Pendiente provider-specific

Cuando se seleccione hosting deben fijarse terminación TLS/proxy trusted IP, proceso supervisor, path de logs, storage cifrado de backups, alertas, health checks, estrategia de zero-downtime y límites de recursos. Un despliegue multi-instancia requiere externalizar cache y rate limit.
