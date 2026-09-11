# Auditoría Fase 8 — Production Readiness

Fecha: 2026-09-10  
Base auditada: `main` / `ed27b6d`  
Alcance: `package.json`, lockfile y workspace pnpm, configuración Nuxt/Prisma, `app/**`, `server/**`, `shared/**`, schema y 13 migraciones, workflows, scripts, pruebas y documentación operativa.

## Resultado inicial

| Severidad | Hallazgo                                                             | Evidencia                                       | Resolución F8                                                                                                      |
| --------- | -------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| BLOCKER   | No existía restore drill demostrado.                                 | Solo había migraciones y scripts de integridad. | Dump custom local restaurado en DB aislada; 45 tablas, 12 migraciones iniciales y 6 tablas esenciales verificadas. |
| HIGH      | Checkout y handoff heredaban `NUXT_SESSION_PASSWORD`.                | `nuxt.config.ts` y `order-security.ts`.         | Fallback permitido solo en desarrollo/test; producción exige tres secretos fuertes e independientes.               |
| HIGH      | Audit de supply chain: 1 crítica, 14 altas, 6 moderadas y 2 bajas.   | `pnpm audit --prod` inicial.                    | Transitivas dentro de rango actualizadas y overrides puntuales; audit final sin vulnerabilidades conocidas.        |
| HIGH      | CI no ejecutaba Prisma completo, E2E ni visual.                      | `.github/workflows/ci.yml`.                     | Gate Windows/PostgreSQL nativo con Prisma, calidad, Vitest, Playwright, visual y build.                            |
| MEDIUM    | Sin headers globales de producción.                                  | Ausencia de middleware/CSP.                     | CSP, nosniff, referrer y permissions policy; HSTS solo en producción HTTPS.                                        |
| MEDIUM    | Health mezclaba proceso y DB y exponía `database: connected`.        | `/api/health`.                                  | `/live` independiente, `/ready` dependiente de DB; compatibilidad `/health` con respuesta mínima.                  |
| MEDIUM    | No había correlation ID ni logging estructurado central.             | `request-context.ts` solo tenía IP/UA.          | UUID server-side, `X-Request-ID`, tiempos/status y redacción central.                                              |
| MEDIUM    | Superficies transaccionales no estaban todas cubiertas por no-store. | Middleware privado limitado a auth/admin.       | Checkout, orders, tickets, carrito, confirmación y buy-now añadidos.                                               |
| MEDIUM    | Carrito indexable y variantes filtradas del catálogo sin `noindex`.  | Metadatos de páginas.                           | `noindex` transaccional y `noindex, follow` para query variants con canonical limpio.                              |
| LOW       | Search, preview y handoff sin antiabuso explícito.                   | Endpoints públicos.                             | Límites moderados en memoria, separados de auth/RBAC.                                                              |

## Seguridad y exposición

- Auth/admin conservan sesión server-side, RBAC y `no-store`.
- No se abre CORS global: UI y API son same-origin.
- `sameSite=lax`, cookies `httpOnly` y `secure` en producción se mantienen.
- Los errores creados con `apiError` usan mensaje genérico para 5xx; los detalles permanecen solo en logs sanitizados.
- DTO públicos y administrativos permanecen separados; no se detectó exposición pública de costos de proveedor, hash de handoff, permisos ni notas privadas.
- Los métodos mutadores continúan materializados como `.post`, `.put` o `.delete`; no hay mutaciones GET.

## CSP y activos

La aplicación SSR necesita scripts de payload/hidratación inline y Nuxt UI necesita estilos inline. Por eso `script-src` y `style-src` conservan `'unsafe-inline'` de forma explícita. El resto se restringe a `self`; imágenes permiten `https:`, `data:` y `blob:` por los assets públicos configurables. `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'` y `frame-src 'none'` reducen superficie. No se habilitó CORS ni analytics.

## Base de datos

- Schema con constraints, FKs e índices alineados a los listados y transacciones existentes.
- Order, Ticket e Inventory conservan transacciones `Serializable`; inventario mantiene bloqueo `FOR UPDATE`.
- La correlación persistente de eventos de auditoría justificó una migración aditiva: `AuditLog.requestId` nullable e índice asociado. Las 13 migraciones se validaron desde una base vacía.
- Producción usa `prisma migrate deploy`; `migrate dev` queda solo para desarrollo.

## Performance baseline local

Ambiente: Node 24.15.0, Windows 10.0.19044, PostgreSQL 18 local, Nuxt dev SSR, 5 muestras, caché fría inicial y posteriores calientes. Son datos diagnósticos, no SLA.

| Ruta                | Status | HTML bytes | Primera muestra ms | Mediana caliente ms |
| ------------------- | -----: | ---------: | -----------------: | ------------------: |
| `/`                 |    200 |     63 732 |             186.53 |              120.23 |
| `/productos`        |    200 |     47 617 |              98.99 |               98.99 |
| `/servicios`        |    200 |     27 942 |             147.02 |               83.96 |
| `/carrito`          |    200 |     22 987 |              95.79 |               71.60 |
| `/checkout`         |    200 |     22 547 |              57.13 |               57.13 |
| `/admin` sin sesión |    302 |        114 |             264.96 |              264.67 |

Presupuesto inicial RC: páginas públicas SSR medianas menores a 500 ms en entorno local caliente, HTML menor a 100 KiB por ruta auditada, health menor a 250 ms y cero error de hidratación en E2E. El baseline cumple; no se alteraron TTL ni consultas sin evidencia.

## Limitaciones conocidas

- Cache, rate limiting y mapa de requests pendientes son memoria local. V1 es apta para una instancia; múltiples instancias requieren storage distribuido antes de producción.
- CSP inline es una compatibilidad deliberada; migrar a nonces requiere un proyecto específico y regresión completa.
- No hay proveedor de hosting, backup externo ni observabilidad elegido. Los runbooks son vendor-neutral.
- El DOCX de planificación se revisó estructuralmente; no pudo renderizarse para QA visual porque LibreOffice no está instalado en el entorno.

## Estado de auditoría

No quedan BLOCKER/HIGH de código conocidos tras la implementación. El cierre final depende de todos los gates locales, la ejecución real de CI y la carga de secretos/dominio/backup schedule en el entorno productivo.
