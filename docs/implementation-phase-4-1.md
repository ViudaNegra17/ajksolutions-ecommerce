# Implementación de la Fase 4.1

## 1. Hallazgos

### Ya protegido

- Customer se normalizaba antes de persistir y conservaba prioridad documento → email → WhatsApp.
- PostgreSQL ya tenía unicidad nullable para documento, email y WhatsApp; múltiples `NULL` son válidos.
- La creación completa de Ticket ya usaba transacción `Serializable`, código correlativo e idempotencia por `requestId`.
- ServiceCategory ya rechazaba auto-padre, padres eliminados y ciclos indirectos mediante recorrido de ancestros.
- La asignación ya filtraba usuarios activos, no eliminados y con `tickets.assign`, incluyendo bypass de `SUPER_ADMIN`.
- TicketHistory ya preservaba `fromAssignedUserId` y `toAssignedUserId`.

### Corregido

- Una carrera de Customer podía terminar en conflicto Prisma aunque la base evitara el duplicado.
- El matching consultaba solo el primer identificador disponible y no detectaba documento y email pertenecientes a clientes distintos.
- `POST /api/tickets/whatsapp-opened` aceptaba únicamente un TCK enumerable.
- El detalle administrativo podía incluir el nuevo hash si se conservaba el retorno escalar predeterminado de Prisma.
- La selección de padre de ServiceCategory aceptaba una categoría directa inactiva.
- El error de asignación no utilizaba el código de dominio solicitado.

## 2. Customer concurrency

No se agregaron columnas `normalized*` porque los campos actuales son el mecanismo equivalente:

- documento: solo letras/números y mayúsculas;
- email: `trim + lowercase`;
- teléfono y WhatsApp: formato internacional canónico.

El Repository consulta simultáneamente todos los identificadores aportados. Si apuntan a más de un Customer, o a uno eliminado que no debe reactivarse implícitamente, devuelve HTTP 409 con `CUSTOMER_IDENTITY_CONFLICT`. Si existe una única coincidencia, la selección mantiene documento → email → WhatsApp.

Las restricciones únicas PostgreSQL serializan la colisión real. El Service reintenta hasta cinco veces la operación completa `Serializable` ante `P2034` o un `P2002` de Customer. Cada intento fallido revierte Customer, secuencia, Ticket, snapshots, historial y auditoría. Así, solicitudes concurrentes equivalentes producen un Customer y N Tickets.

## 3. WhatsApp handoff

Cada Ticket nuevo genera `randomBytes(32)` y devuelve el token base64url de 43 caracteres solo en la respuesta inicial. Se persiste `SHA-256(token)` en `whatsappHandoffTokenHash`; el valor plano no se almacena.

El endpoint requiere:

```json
{
  "ticketCode": "TCK-000123",
  "handoffToken": "token-opaco"
}
```

La validación comprueba token, asociación al TCK y estado no cancelado, usando `timingSafeEqual`. Cualquier fallo devuelve HTTP 404 y `TICKET_HANDOFF_INVALID`, sin revelar si el TCK existe. La primera llamada fija `whatsappOpenedAt`; repeticiones válidas retornan éxito sin sobrescribir la fecha ni duplicar auditoría. El estado del Ticket no cambia.

Un retry por `requestId` conserva idempotencia y no inventa un token recuperable: el token se entrega una sola vez. La URL y el mensaje de WhatsApp nunca contienen el token.

## 4. ServiceCategory

Se conservó el recorrido de ancestros existente y se extrajo una función pura para regresiones de auto-ciclo, ciclo indirecto y jerarquía previamente corrupta. Una actualización A → C se rechaza si C → B → A. El padre directo también debe existir, no estar eliminado y estar activo.

No se agregó un trigger recursivo: el patrón de Service ya utilizado por categorías de producto cubre la escritura administrativa sin introducir complejidad SQL desproporcionada. El check de auto-padre PostgreSQL permanece.

## 5. Assignment

Una nueva asignación exige:

- `active = true`;
- `deletedAt = null`;
- rol `SUPER_ADMIN` o permiso efectivo `tickets.assign`.

La comprobación ocurre en servidor aunque se manipule el selector. `SUPPORT` y `ADMIN` son elegibles según el seed; `SALES` no lo es al carecer de `tickets.assign`. El selector consulta la misma regla y omite usuarios inválidos.

La desactivación posterior no borra asignaciones históricas. Solo impide nuevas asignaciones; el administrador puede reasignar. Los rechazos usan HTTP 422 y `TICKET_ASSIGNMENT_USER_INVALID`.

## 6. Prisma

`Ticket` incorpora:

```text
whatsappHandoffTokenHash String? @unique @db.Char(64)
```

El campo es nullable para conservar tickets anteriores y su hash se omite expresamente del detalle administrativo. No se exponen IDs internos, notas, auditoría ni hash en el DTO público.

## 7. Migración

Nueva migración:

```text
20260831090000_phase4_1_ticket_customer_hardening
```

Agrega:

- columna e índice único de hash de handoff;
- check hexadecimal SHA-256 de 64 caracteres;
- checks canónicos para documento, email y WhatsApp.

Las restricciones únicas nullable de Customer creadas en Fase 4 se conservan: PostgreSQL permite múltiples `NULL` y rechaza duplicados no nulos. No se modificaron migraciones anteriores.

## 8. Services

- Customer Repository: búsqueda conjunta, prioridad explícita y conflicto de identidades.
- Ticket Service: retry acotado de transacciones, generación/hash de token, autorización e idempotencia de apertura.
- ServiceCategory Service: helper de ciclos y rechazo de padre directo inactivo.
- Assignment: helper de elegibilidad reutilizado por la validación de servidor.
- Audit Service: `TICKET_WHATSAPP_OPENED` únicamente en la primera apertura y sin token.

## 9. APIs

- `POST /api/tickets` agrega `handoffToken` al resultado inicial sin exponer el hash.
- `POST /api/tickets/whatsapp-opened` ya no acepta solo TCK y requiere token válido.
- `GET /api/admin/tickets/options` lista únicamente responsables elegibles.
- `PUT /api/admin/tickets/:id/assignment` vuelve a validar elegibilidad en servidor.
- El detalle administrativo omite `whatsappHandoffTokenHash`.

## 10. Tests

### Unit

- normalización y conflicto de identidad;
- generación, hash y verificación del token;
- TCK sin token rechazado por Zod;
- ciclos directos, indirectos y cadena repetida;
- elegibilidad activa, eliminada, sin permiso, SUPPORT y SUPER_ADMIN.

### Integration

- concurrencia PostgreSQL por WhatsApp, documento y email;
- un Customer con N Tickets;
- conflicto documento/email entre Customers;
- token válido, inválido y cruzado entre tickets;
- primera apertura, repetición idempotente, estado `NEW` y auditoría única;
- hash ausente del DTO administrativo;
- ciclo indirecto A → B → C → A;
- asignación inactiva, eliminada, sin permiso y SUPPORT válida;
- historial de asignación preservado.

### E2E

- creación pública, recepción del token y CTA;
- TCK solo rechazado;
- apertura registrada con token sin abrir el servicio externo;
- usuario inválido ausente del selector y rechazado por API;
- asignación correcta a SUPPORT.

## 11. Gates

- `pnpm exec prisma validate`: OK.
- `pnpm db:deploy`: OK; cinco migraciones aplicadas y esquema actualizado.
- `pnpm db:generate`: OK.
- `pnpm db:seed`: OK.
- `pnpm exec prisma migrate status`: OK; base principal al día.
- `pnpm lint`: OK.
- `pnpm format:check`: OK.
- `pnpm typecheck`: OK.
- `pnpm test`: 9 archivos y 59 tests aprobados.
- `pnpm test:e2e`: 14 tests aprobados.
- `pnpm build`: OK.

Validación desde PostgreSQL vacío:

- se creó una base temporal aislada;
- se aplicaron las cinco migraciones en orden;
- el seed finalizó correctamente;
- 3 archivos y 15 tests de integración aprobaron contra la base limpia;
- la base temporal fue eliminada al terminar;
- no se utilizó Docker ni se alteró la base principal durante esta validación.

## 12. Regresiones

No se cambiaron rutas comerciales ni el diseño de servicios/tickets. Se preservan idempotencia por `requestId`, rate limit existente, snapshots, estados, prioridad, mensajes, historial y contenido comercial de WhatsApp.

## 13. Deuda técnica

- Los rate limits continúan en memoria y son adecuados para una sola instancia.
- Tickets anteriores a Fase 4.1 tienen hash nulo y no pueden registrar una nueva apertura pública.
- El token no expira porque solo autoriza registrar la primera apertura; una política temporal agregaría estado sin beneficio actual.
- Los checks e índices dependen de PostgreSQL y deben revisarse si cambia el motor.

## 14. Estado

```text
FASE 4.1
CERRADA
```

No se implementó ninguna funcionalidad de Fase 5.
