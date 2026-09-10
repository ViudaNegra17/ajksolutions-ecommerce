# Administrative session security hardening

## Alcance y amenazas mitigadas

Este hardening previo a Fase 8 refuerza exclusivamente la sesión del administrador. Mitiga equipos abandonados con sesión utilizable, renovación accidental del máximo, acceso directo a `/api/admin/**` con estado cliente manipulado, uso posterior a desactivar usuarios o retirar permisos y recuperación operativa mediante Atrás después del logout. No cambia negocio, RBAC, UI 7.5, Prisma ni caché público.

## Política final

| Control         | Política                                                 |
| --------------- | -------------------------------------------------------- |
| Máximo absoluto | 8 horas desde `loggedInAt`                               |
| Inactividad     | 30 minutos desde `lastActivityAt`                        |
| Aviso           | Últimos 2 minutos del límite idle                        |
| Revalidación    | Cada ~5 minutos y al volver a una pestaña desactualizada |
| Touch           | Máximo una escritura de actividad por minuto             |
| Autoridad       | Servidor                                                 |

La sesión cifrada de `nuxt-auth-utils` conserva `user`, `loggedInAt`, `lastActivityAt` y `lastValidatedAt`. Una sesión anterior sin `lastActivityAt` usa `loggedInAt` como fallback cerrado. `localStorage` no es fuente de verdad.

## Expiración absoluta, idle y cookie

`loggedInAt + 8h` es inamovible aunque exista actividad. Cada escritura usa únicamente los segundos restantes hasta ese instante, por lo que refrescar usuario, permisos o actividad no abre otras ocho horas. Se conservan `httpOnly: true`, `secure` en producción, `sameSite: lax` y `maxAge` inicial de ocho horas; JavaScript no lee el cookie.

El servidor rechaza cuando `now >= lastActivityAt + 30m`, limpia el cookie y responde `401`. Navegaciones y requests administrativos válidos cuentan como actividad, con persistencia throttled a una vez por minuto. `GET /api/auth/session` valida sin extender actividad.

## Enforcement y revalidación servidor

`server/middleware/admin-session.ts` precede todo `/api/admin/**` y comprueba sesión, timestamps, máximo absoluto, máximo idle, usuario activo y roles/permisos actuales. Guarda el resultado en el contexto; `requirePermission` lo reutiliza y aplica el permiso concreto sin duplicar la consulta.

`GET /api/auth/session` aplica la misma validación, refresca roles/permisos y devuelve solo `user`, `loggedInAt`, `lastActivityAt`, `lastValidatedAt`, `expiresAt` e `idleExpiresAt`. `POST /api/auth/session/touch` revalida antes de tocar actividad y respeta el throttle.

## Guard, visibilidad y aviso

`useAdminSessionGuard` vive en el layout admin. Escucha `pointerdown`, `keydown`, `scroll` y `touchstart`, agrupando eventos en memoria sin request por evento. Cada cinco minutos usa `touch` si hubo interacción o `session` si no la hubo. Al volver visible revalida si han pasado cinco minutos. Ante `401`, usuario nulo o deadline confirmado limpia estado y redirige a `/admin/login?reason=session-expired`.

Un `UModal` no descartable muestra “Tu sesión administrativa está por expirar por inactividad” durante los últimos dos minutos idle. “Seguir conectado” revalida/toca; “Cerrar sesión” hace logout real. El login presenta un mensaje seguro sin códigos, cookies ni stack.

## Usuario desactivado y RBAC

Cada revalidación resuelve al usuario activo en PostgreSQL. Si fue desactivado o eliminado, limpia la sesión. Si cambiaron roles o permisos, actualiza sesión, sidebar y enforcement; `SUPER_ADMIN` conserva su semántica existente.

## Caché

`/admin`, `/api/admin/**` y `/api/auth/**` usan `Cache-Control: no-store`. No se modificaron `public-cache`, TTL, invalidación pública, `X-Public-Cache`, checkout ni read models públicos.

## Pruebas

- Unitarias: válida, compatibilidad, absoluto, idle, aviso, maxAge restante, usuario desactivado, roles/permisos, touch y no-cache.
- Playwright: idle y absoluto sin espera real, modal/continuidad, usuario desactivado, permiso retirado, Atrás tras logout y headers privados.
- `/api/_test/admin-session` solo existe en `import.meta.dev`, exige autenticación y ajusta únicamente timestamps de esa misma sesión.

## Limitaciones conocidas

- Sin infraestructura multi-tab adicional: cada pestaña detecta cambios en su siguiente request, revalidación o retorno visible.
- Un fallo de red antes del deadline no cierra de inmediato; al alcanzarlo el cliente falla cerrado y el servidor continúa como autoridad.
- La sesión es cookie cifrado/stateless. Revocación global instantánea distinta de desactivar usuario requeriría almacén de sesiones o versión persistida.

## Recomendaciones de producción

- Mantener `NUXT_SESSION_PASSWORD` aleatorio, de alta entropía y fuera del repositorio.
- Servir solo por HTTPS y sincronizar relojes de nodos con NTP.
- Monitorizar expiraciones e invalidaciones sin registrar cookies.
- Añadir un mecanismo central de revocación si se requiere cierre instantáneo en todos los dispositivos.

## Base de datos y regresiones

No cambió `prisma/schema.prisma`: 0 migraciones nuevas. No cambiaron sidebar, branding, tema, navegación pública, tarjetas ni caché 7.5. Fase 8 no se inició.

## Gates de cierre

- ESLint: PASS.
- Prettier: PASS.
- TypeScript/Nuxt typecheck: PASS.
- Vitest: 123/123.
- Playwright: 65/65; incluye 19/19 comparaciones visuales.
- Build Nuxt/Nitro: PASS.
- Prisma: 12 migraciones aplicadas y 0 nuevas.
