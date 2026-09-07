# Implementación de la Fase 4

## 1. Resumen de implementación

La Fase 4 incorpora un módulo completo de servicios y atención por tickets sobre PostgreSQL. El flujo público es:

```text
Servicio publicado
→ formulario relacional dinámico
→ identificación o creación conservadora del cliente
→ ticket y snapshots persistidos en una transacción
→ código TCK correlativo
→ CTA de WhatsApp
```

WhatsApp es un canal de continuación, no la fuente de verdad. El ticket existe aunque el usuario no abra o no envíe el mensaje.

## 2. Archivos creados

Principales grupos incorporados:

- Prisma: `prisma/migrations/20260830191321_phase4_services_tickets/migration.sql`.
- Contratos: `shared/schemas/service-*.schema.ts`, `customer.schema.ts`, `ticket*.schema.ts`, `shared/types/services.ts` y `shared/utils/tickets.ts`.
- Persistencia y dominio: `service.repository.ts`, `customer.repository.ts`, `ticket.repository.ts`, `service-management.service.ts`, `public-service.service.ts` y `ticket.service.ts`.
- API pública: `/api/services`, `/api/service-categories`, `POST /api/tickets` y `POST /api/tickets/whatsapp-opened`.
- API administrativa: CRUD de categorías y servicios; listado, opciones, detalle, estado, prioridad, asignación y mensajes de tickets; configuración comercial.
- UI pública: `ServiceCard`, `ServicePrice`, `DynamicServiceForm`, `/servicios` y `/servicios/[slug]`.
- UI administrativa: `ServiceAdminForm`, `/admin/servicios`, categorías, alta/edición, `/admin/tickets`, detalle y configuración.
- Pruebas: `services-phase4.test.ts` en unitarias, integración y E2E.

## 3. Archivos modificados

- `prisma/schema.prisma` y `prisma/seed.ts`.
- `shared/constants/permissions.ts`.
- `server/repositories/code.repository.ts`.
- Home, dashboard, sitemap, navegación administrativa y README.
- `docs/technical-decisions.md` y `.env.example`.

## 4. Prisma

### Modelos

- `ServiceCategory`: jerarquía, orden, publicación y soft delete.
- `Service`: código comercial, modalidad de precio, impuestos, modalidades de atención, SEO y publicación.
- `ServiceFormField` y `ServiceFormFieldOption`: definición normalizada del formulario.
- `Customer`: identidad comercial reutilizable y datos normalizados.
- `Ticket`: solicitud, servicio, cliente, responsable, estado, prioridad, origen e idempotencia.
- `TicketFieldValue` y `TicketFieldValueOption`: respuestas tipadas y snapshots históricos.
- `TicketMessage`: mensajes de cliente, personal o sistema; admite notas internas.
- `TicketAttachment`: metadatos listos para una futura infraestructura de archivos.
- `TicketHistory`: cambios de estado, prioridad y asignación.

### Enums

- `ServicePriceMode`: `FIXED`, `FROM`, `QUOTE`.
- `ServiceFormFieldType`: texto, textarea, número, booleano, selección simple/múltiple, fecha, email y teléfono.
- `TicketStatus`, `TicketPriority`, `TicketSource`, `TicketMessageType` y `TicketHistoryAction`.

### Integridad

- Relaciones con `Restrict` o `Cascade` según conservación histórica.
- `requestId` único para idempotencia pública.
- Clave de campo única por servicio y valor de opción único por campo.
- Índices para estado, prioridad, servicio, cliente, responsable y fecha de ticket.
- Checks SQL para precio según modalidad, tasa fiscal, clave de campo, forma de valor tipado, mensajes y tamaño de adjunto.
- El borrado de servicios y formularios es lógico; las respuestas y tickets históricos no se destruyen.

## 5. Migración

Migración aplicada: `20260830191321_phase4_services_tickets`.

Además de tablas, enums, claves foráneas e índices generados por Prisma, contiene defensa SQL para:

- impedir precio en `QUOTE` y exigir precio positivo en `FIXED`/`FROM`;
- evitar categoría padre de sí misma;
- validar la sintaxis de claves dinámicas;
- exigir un único tipo de valor por respuesta;
- proteger autor/tipo de mensaje y tamaños no negativos.

No se modificaron migraciones anteriores.

## 6. Seed

El seed idempotente ahora incorpora:

- permisos de categorías de servicio, servicios y tickets;
- matrices para `ADMIN`, `SALES`, `SUPPORT` y `SUPER_ADMIN`;
- setting único `business.whatsapp` desde `SEED_BUSINESS_WHATSAPP`;
- secuencias `service`, `customer` y `ticket`;
- categoría `Soporte técnico`;
- servicio publicado `SRV-000001 — Diagnóstico técnico` con campo obligatorio.

## 7. Servicios de dominio

### Precios

`FIXED` y `FROM` usan Decimal y cálculo fiscal existente. `QUOTE` persiste `NULL` y nunca se representa como cero ni genera un `Offer` falso en JSON-LD.

### Formularios dinámicos

El administrador define campos y opciones relacionales y puede ordenarlos. Zod y el servicio validan claves reservadas, duplicados, tipos, rangos, obligatoriedad, pertenencia de campos y pertenencia de opciones. Los campos retirados se desactivan para preservar la historia.

### Tickets

La creación usa una transacción serializable para cliente, código `TCK-`, ticket, respuestas, opciones, historial y auditoría. El `requestId` permite reintentar sin duplicar. Un servicio inactivo o eliminado no acepta solicitudes.

### Clientes

La búsqueda conservadora prioriza documento normalizado, después email y finalmente WhatsApp. No se fusionan clientes por nombre. Email, documento y teléfonos se normalizan antes de comparar y persistir.

### WhatsApp

El destino se lee exclusivamente de `business.whatsapp`. El mensaje se codifica, contiene el TCK, cliente, servicio y respuestas relevantes. El frontend recibe solamente el código, estado y URL. La apertura se registra de forma separada.

## 8. APIs públicas

- `GET /api/services`: búsqueda, categoría y destacados con DTO mínimo.
- `GET /api/services/:slug`: detalle publicado y formulario activo.
- `GET /api/service-categories`: categorías públicas con servicios visibles.
- `POST /api/tickets`: validación, rate limit, anti-spam, idempotencia y creación transaccional.
- `POST /api/tickets/whatsapp-opened`: registra el handoff sin exponer el ticket.

Ninguna respuesta pública expone notas internas, responsables, auditoría o datos operativos.

## 9. APIs administrativas

- CRUD protegido de `/api/admin/service-categories`.
- CRUD protegido de `/api/admin/services`.
- Listado paginado y filtrado, opciones y detalle de `/api/admin/tickets`.
- Cambios protegidos de estado, prioridad, asignación y notas.
- Lectura/actualización de `/api/admin/settings/business`.

La arquitectura se mantiene `Nuxt → API → Service → Repository → Prisma`.

## 10. UI pública

- Catálogo SSR con búsqueda y filtro por categoría.
- Tarjetas con modalidad, precio real y CTA.
- Detalle SSR con canonical, meta y JSON-LD `Service`; `QUOTE` omite `Offer`.
- Formulario generado desde definiciones relacionales.
- Estado de carga, errores y confirmación visible con `TCK-XXXXXX`.
- WhatsApp solo se habilita después de recibir el ticket persistido.
- Home y sitemap incluyen servicios publicados.

## 11. UI administrativa

- Categorías jerárquicas con soft delete.
- Alta y edición de servicio, precio, modalidades, publicación y SEO.
- Constructor de campos y opciones dinámicas con ordenamiento.
- Listado de tickets paginado en servidor y filtros por estado, prioridad, servicio y responsable.
- Detalle con cliente, snapshots, historial, notas internas, estado, prioridad y asignación.
- Dashboard con tickets nuevos, en progreso y pendientes.
- Configuración única del WhatsApp comercial.

## 12. RBAC

Los permisos se verifican en cada endpoint, no solo en la UI:

- `serviceCategories.view/create/update/delete`;
- `services.view/create/update/delete`;
- `tickets.view/create/update/assign/managePriority/addMessage`.

`SUPER_ADMIN` conserva bypass explícito. `SALES` y `SUPPORT` reciben únicamente las capacidades definidas en el seed.

## 13. Auditoría

Se auditan categorías, servicios, cambios de precio, creación pública de tickets, estado, prioridad, asignación, notas y actualización del WhatsApp comercial. La creación pública usa el mismo cliente transaccional del ticket.

## 14. Seguridad

- Zod en query y body.
- Validación de pertenencia de campos/opciones para impedir tampering.
- Honeypot y tiempo mínimo de llenado.
- Rate limit de 5 solicitudes por IP cada 15 minutos.
- Idempotencia mediante UUID único.
- DTO público mínimo.
- Teléfonos normalizados y URL codificada.
- Notas internas sin endpoint público.
- Transiciones de estado explícitas.

## 15. Tests

- Unitarios: modalidades de precio, formularios, normalización, transiciones, WhatsApp, esquema público y rate limit.
- Integración PostgreSQL: snapshots, constraints, idempotencia, permisos, setting y secuencias.
- E2E público: listado, detalle, SEO, sitemap, formulario, creación del ticket y CTA.
- E2E administrativo: crear/publicar servicio dinámico; abrir ticket, cambiar estado, asignar y agregar nota.

## 16. Gates

Ejecutados sobre PostgreSQL local:

```text
prisma validate                  OK
pnpm db:deploy                  OK
pnpm db:seed                    OK
prisma migrate status           OK — 4 migraciones aplicadas
pnpm lint                       OK
pnpm typecheck                  OK
pnpm test                       OK — 8 archivos / 47 pruebas
pnpm test:e2e                   OK — 14 recorridos completos (4 de Fase 4)
pnpm build                      OK
```

También se creó una base PostgreSQL temporal vacía para comprobar el arranque real: las cuatro migraciones se desplegaron desde cero, el seed idempotente finalizó y las pruebas de base de datos/Fase 4 pasaron. La base temporal fue eliminada después de la verificación.

El cierre definitivo se volvió a validar después de los últimos ajustes, incluyendo `pnpm format:check`, la suite completa y el estado de migraciones.

## 17. Deuda técnica real

- `TicketAttachment` está preparado, pero el upload permanece deshabilitado porque el proyecto no tiene R2 estable. No se añadió almacenamiento binario improvisado.
- Los rate limits de login y tickets viven en memoria y son adecuados únicamente para una instancia. Deben migrar a un almacén compartido al escalar horizontalmente.
- No hay portal público de seguimiento ni notificaciones por correo en esta fase, según alcance.

## 18. Estado final

```text
FASE 4
CERRADA
```

No se implementó ninguna entidad ni flujo de Fase 5.
