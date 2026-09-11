# Checklist de seguridad de producción

## Configuración y secretos

- [ ] Las cinco variables críticas existen en el secret store, no en Git.
- [ ] Session, checkout y handoff usan valores independientes de 32+ caracteres.
- [ ] `NUXT_PUBLIC_APP_URL` es el origen HTTPS final, sin localhost.
- [ ] La app falla al arrancar ante configuración ausente, débil o reutilizada.
- [ ] `.env`, dumps y credenciales no forman parte del artefacto ni logs.

## HTTP y sesión

- [ ] CSP, nosniff, referrer y permissions policy están presentes.
- [ ] HSTS aparece solo detrás de HTTPS productivo; no se habilitó preload.
- [ ] No existe CORS global ni `Access-Control-Allow-Origin: *` para auth/admin.
- [ ] Auth/admin/checkout/orders/tickets y páginas transaccionales responden `no-store`.
- [ ] Cookie admin es `httpOnly`, `secure` en producción y `sameSite=lax`.
- [ ] Expiración absoluta 8 h, idle 30 min, warning 2 min y revalidación server-side pasan.

## Autorización e integridad

- [ ] Admin sin sesión recibe 401/redirect y un permiso retirado produce 403.
- [ ] Usuario desactivado o rol removido pierde acceso en revalidación.
- [ ] UUID/payload inválido, ID tampering y ownership no filtran datos.
- [ ] Checkout firmado, idempotencia, Serializable y handoff token resisten tampering/replay.
- [ ] Promotions no alteran precio; DIGITAL no crea keys ni inventario interno.

## Errores, logs y abuso

- [ ] Respuestas 5xx no contienen stack, SQL, Prisma, paths, DSN ni tokens.
- [ ] Cada respuesta tiene `X-Request-ID`; logs usan JSON con nivel, ruta, status y duración.
- [ ] Password/cookie/authorization/session/secret/handoff/checkout signature están redactados.
- [ ] Login 8/15 min; Order y Ticket 5/15 min; preview 30/5 min; handoff 20/15 min; search 120/min.
- [ ] Se acepta que los límites son por instancia; multi-instancia está bloqueada hasta usar storage compartido.

## Supply chain y operación

- [ ] `pnpm install --frozen-lockfile` y `pnpm audit --prod` no reportan vulnerabilidades conocidas.
- [ ] No se ejecutan tests destructivos contra producción.
- [ ] Backup cifrado, acceso restringido y restore drill vigente.
- [ ] CI, smoke y runbook están verdes sobre el tag exacto.
