# Implementación de la Fase 5

## 1. Implementado

Se implementó Producto → Carrito → Preview → Checkout invitado → Customer/Address → Order/OrderItems → reserva → `ORD-` → WhatsApp. PostgreSQL registra el pedido antes del canal externo. No se implementaron pagos, facturación, login de cliente, entrega de licencias ni Fase 6.

## 2. Prisma

Se agregaron `Address`, `Order`, `OrderAddress`, `OrderItem` y `OrderStatusHistory`; enums `DeliveryType`, `OrderStatus`, `OrderSource` y `AvailabilitySource`; y relaciones no destructivas con Customer, Product, ProductVariant y User. `InventoryMovement.createdById` pasa a nullable para movimientos originados por checkout público.

Los importes usan Decimal. Existen checks de no negativos, coherencia de total, cantidad/precio positivos, moneda canónica, fingerprint y hash; además de unicidad e índices de operación.

## 3. Migración

`20260831150000_phase5_cart_checkout_orders` crea todo el dominio de pedidos. No se modificaron migraciones anteriores.

## 4. Cart

`useCartStore` usa Pinia y localStorage versionado. Maneja items, altas, bajas, cantidad, limpieza y contador; combina producto+variante y limita cantidad a 99. Precio, imagen y nombre son snapshots de UX. CONTACT nunca entra y no usa `$0`. Variantes requieren selección. El carrito se limpia solo después de crear Order.

## 5. Checkout preview

`POST /api/checkout/preview` acepta exclusivamente producto, variante, cantidad y entrega. Normaliza duplicados, limita 50 líneas y resuelve catálogo, ubicación, inventario y proveedor en bloque. Devuelve strings monetarios y warnings sin costos ni internals.

## 6. Checkout fingerprint

La resolución canónica se firma HMAC-SHA256 con `NUXT_CHECKOUT_SIGNING_SECRET`. Create recalcula dentro de Serializable y compara de forma temporalmente segura; un cambio devuelve `CHECKOUT_CHANGED`.

## 7. Order creation

`POST /api/orders` valida honeypot, tiempo mínimo y 5 solicitudes/15 minutos/IP. Customer, Address, ORD, Order, snapshots, reservas, movimientos, historia y auditoría se escriben en una transacción. Un fallo revierte todo.

## 8. Customer reuse

Se reutiliza Customer de Fase 4.1 con idéntica normalización, conflicto de identidades y retry acotado. No existe otra entidad de cliente.

## 9. Address / OrderAddress

PICKUP no exige dirección; DELIVERY exige provincia, ciudad, línea y referencia. Address es reutilizable y OrderAddress es snapshot inmutable. Shipping queda en cero y `shippingPendingQuote=true` para DELIVERY: significa “por coordinar”, no “gratis”.

## 10. OrderItem snapshots

Cada línea guarda códigos, SKU, nombres, variante, precio, IVA, cantidad, totales, fuente y lead time. Editar Product, Variant o Address no altera historia. No existe endpoint genérico de edición.

## 11. Inventory reservation

La ubicación proviene de `inventory.defaultLocationCode` (`LOC-000001` en seed), nunca de UUID hardcodeado. OWN_STOCK hace update atómico condicionado por disponible y crea `RESERVATION`. Cancelar crea `RELEASE`; DELIVERED reduce on-hand y reserva simultáneamente y crea `SALE`. No hay doble descuento.

## 12. Supplier stock behavior

OWN_STOCK se usa solo si cubre toda la línea. Si no, un proveedor activo debe cubrirla completa. No se mezclan fuentes, no se suman proveedores, no se crea stock ficticio, no cambia supplierStock y no se crea movimiento físico.

## 13. Status transitions

La matriz central cubre NEW → CONTACTED → CONFIRMED → PAYMENT_PENDING/PAID → PREPARING → READY → SHIPPED/DELIVERED. Cancelación se permite hasta PAYMENT_PENDING. Saltos y terminales inválidos se rechazan. `OrderStatusService` centraliza timestamps, historia, auditoría e inventario.

## 14. Idempotency

`Order.requestId` UUID es único. Repetir requestId con el mismo fingerprint devuelve el mismo Order sin repetir reservas. Otro checkout devuelve `ORDER_IDEMPOTENCY_CONFLICT`.

## 15. WhatsApp handoff

El token es HMAC-SHA256 base64url derivado de requestId+orderId mediante `NUXT_ORDER_HANDOFF_SECRET`; la base guarda solo SHA-256. Un retry recupera ORD, URL y token. ORD solo no autoriza. Primera apertura audita una vez, es idempotente y no cambia estado.

## 16. Public APIs

- `POST /api/checkout/preview`.
- `POST /api/orders`.
- `POST /api/orders/whatsapp-opened`.

No existe lookup público por ORD ni exposición de customerId, proveedor, inventario, auditoría o hashes.

## 17. Admin APIs

- `GET /api/admin/orders` paginado y filtrable.
- `GET /api/admin/orders/:id` sin secretos.
- `PUT /api/admin/orders/:id/status` con dominio e inventario.

## 18. UI pública

Se añadieron CTA elegible, contador, `/carrito`, `/checkout` y `/pedido/confirmado`. La UI muestra precio actualizado, IVA, fuente, warnings y entrega. La confirmación usa sessionStorage, sin datos privados en query.

## 19. UI admin

`/admin/pedidos` ofrece tabla y filtros. `/admin/pedidos/:id` muestra Customer, snapshots, totales, fuente, WhatsApp, notas, historia y cambio protegido; nunca supplierCost ni secretos.

## 20. RBAC

Se agregaron `orders.view`, `orders.update`, `orders.cancel` y `orders.manageStatus`, conservando `orders.manage` por compatibilidad. ADMIN recibe todos; SALES view/update/manageStatus; SUPPORT solo view; SUPER_ADMIN bypass.

## 21. Audit

Se registran `ORDER_CREATED`, `ORDER_STATUS_CHANGED`, `ORDER_CANCELLED`, `ORDER_DELIVERED` y `ORDER_WHATSAPP_OPENED`. Movimientos referencian Order. No se auditan secretos ni costos.

## 22. Tests

Unit cubre store, cantidades, Zod, Decimal, fuente, fingerprint, token, estados, ORD sin token y rate limit. Integración cubre Customer, snapshots, FIXED/CONTACT, variantes, own/supplier/mixto, última unidad concurrente, checkout cambiado, retry, cancelar, entregar, RBAC y handoff. E2E cubre compra, precio cambiado, falta de stock y admin.

## 23. Gates

- Prisma format, validate, generación del cliente, deploy, seed y estado de migraciones: OK.
- PostgreSQL principal: seis migraciones aplicadas y esquema actualizado.
- Lint, comprobación de formato y typecheck: OK.
- Vitest completo: 11 archivos y 77 pruebas aprobadas.
- Playwright completo: 18 escenarios E2E aprobados, incluidas las fases anteriores.
- Build Nuxt/Nitro de producción: OK.
- Reconstrucción independiente desde PostgreSQL vacío: seis migraciones y seed aprobados; 6 archivos y 39 pruebas de integración aprobadas.
- La base temporal ajksolutions_phase5_verify_20260831 fue eliminada después de validar. No se usó Docker.

## 24. Regresiones

Se preservaron catálogo SSR, DTO público, tickets, handoff TCK, catálogo admin, inventario manual, settings, auditoría y autenticación.

## 25. Deuda técnica

- Rate limit en memoria para una instancia.
- Reservas sin TTL; liberación manual.
- Shipping coordinado fuera del sistema.
- Supplier stock manual, sin reserva externa.
- Sin edición de Order, pagos, facturación, cuenta ni fulfillment digital.
- `orders.manage` queda legado hasta una limpieza coordinada.

## 26. Estado

```text
FASE 5
CERRADA
```

No se implementó Fase 6.
