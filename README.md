# AjkSolutionS eCommerce

Plataforma comercial de AjkSolutionS. Esta entrega cubre Fases 0–5.1: infraestructura local, autenticación, RBAC, auditoría, catálogo, inventario, portal público SSR, servicios, pedidos y hardening de integridad transaccional.

## Stack

- Node.js 24+, pnpm 11
- Nuxt 4.5.2, Vue 3, TypeScript estricto
- Nuxt UI 4.11.0 y Pinia
- Nitro server routes
- PostgreSQL 18.6 instalado localmente
- Prisma ORM 7.10.0 con adaptador `pg`
- Sesiones cifradas con `nuxt-auth-utils`
- Argon2id para contraseñas, Zod para validación
- Vitest y Playwright

> Prisma 8 aún no tiene una publicación estable utilizable en npm al momento de esta base. Se fijó Prisma 7.10.0 para evitar introducir un release candidate en producción. Véase `docs/technical-decisions.md`.

## Arranque local

Requisitos: Node.js 24+, pnpm 11+ y una instancia local de PostgreSQL activa.

```bash
pnpm install
cp .env.example .env
```

En Windows PowerShell, copie el archivo con `Copy-Item .env.example .env`. Actualice `DATABASE_URL` con el usuario, contraseña, puerto y base de datos de su instalación local. Cambie también `NUXT_SESSION_PASSWORD`, `NUXT_CHECKOUT_SIGNING_SECRET` y `NUXT_ORDER_HANDOFF_SECRET` (32 caracteres o más y valores diferentes), además de `SEED_ADMIN_PASSWORD`.

```bash
pnpm db:deploy
pnpm db:seed
pnpm dev
```

La tienda queda en `http://localhost:3000` y el acceso administrativo en `http://localhost:3000/admin/login`.

## Comandos

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm db:deploy
pnpm db:seed
pnpm db:studio
```

El seed es idempotente. Crea roles, permisos, configuración comercial/fiscal, secuencias, ubicación principal, servicio inicial y el superadministrador. `SEED_DEFAULT_TAX_RATE` define la tasa inicial y `SEED_BUSINESS_WHATSAPP` el destino de solicitudes de servicio.

## Estructura

```text
app/                    Portal público SSR, login y administración de catálogo
server/api/             Endpoints Nitro
server/repositories/    Acceso a persistencia
server/services/        Casos de uso y auditoría
server/utils/           Prisma, RBAC, errores y rate limit
shared/                 Contratos, esquemas y permisos compartidos
prisma/                 Schema, migraciones y seed
tests/                  Unitarias, integración y E2E
docs/                   Decisiones técnicas
```

## Seguridad base

- Cookies de sesión `httpOnly`, `sameSite=lax` y `secure` en producción.
- Respuestas de login genéricas y trabajo Argon2 también para usuarios inexistentes.
- Rate limit en memoria por IP para login (apto para una instancia; migrar a Redis al escalar).
- Guards de servidor por permisos; la protección del cliente es solo experiencia de usuario.
- Auditoría para login, logout y fallos de autenticación.
- No se versionan secretos ni el cliente Prisma generado.

## Catálogo administrativo

Después de iniciar sesión, el catálogo se administra desde `/admin/catalogo`. Incluye categorías jerárquicas, marcas, proveedores, atributos, productos con variantes, imágenes por URL, stock por ubicación y movimientos. El stock de proveedor se mantiene separado del inventario físico.

## Portal público

La tienda pública incluye Home, `/productos`, `/categoria/:slug` y `/productos/:slug`, con búsqueda, filtros en URL, variantes, disponibilidad, relacionados, metadata SSR, JSON-LD, sitemap y robots. Las respuestas públicas no exponen costos, proveedores, reservas ni datos administrativos.

## Servicios y tickets

`/servicios` publica servicios activos y `/servicios/:slug` genera formularios desde PostgreSQL. Cada solicitud crea primero cliente, ticket `TCK-`, respuestas e historial, y luego habilita WhatsApp. La operación se gestiona en `/admin/servicios` y `/admin/tickets`.

## Carrito, checkout y pedidos

El carrito Pinia persiste localmente y conserva solo snapshots de presentación. `/checkout` obtiene precios, IVA y disponibilidad desde el servidor, confirma mediante fingerprint HMAC y crea el `ORD-` antes de habilitar WhatsApp. Las líneas de stock propio se reservan transaccionalmente; proveedor permanece separado. La operación, historial, cancelación y entrega se gestionan en `/admin/pedidos`.

## Alcance pendiente

Pagos en línea, facturación, portal público de seguimiento, upload de adjuntos, licencias completas, notificaciones e integraciones externas pertenecen a fases posteriores.

## Documentación

- [Implementación de las Fases 0 y 1](docs/implementacion-fases-0-1.md)
- [Implementación de la Fase 2](docs/implementation-phase-2.md)
- [Hardening de integridad de la Fase 2.1](docs/implementation-phase-2-1.md)
- [Implementación de la Fase 3](docs/implementation-phase-3.md)
- [Implementación de la Fase 4](docs/implementation-phase-4.md)
- [Hardening de la Fase 4.1](docs/implementation-phase-4-1.md)
- [Implementación de la Fase 5](docs/implementation-phase-5.md)
- [Hardening de integridad de la Fase 5.1](docs/implementation-phase-5-1.md)
- [ADR-001: frontera pública del catálogo](docs/adr/ADR-001-public-catalog-read-model.md)
- [Decisiones técnicas](docs/technical-decisions.md)
