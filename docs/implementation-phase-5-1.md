# Implementación de la Fase 5.1

## 1. Hallazgos

### Ya protegido

- Checkout y creación de Order operan en transacciones Serializable con retry acotado.
- requestId es UUID único y el retry no duplica Order ni reservas.
- OrderItem y OrderAddress conservan snapshots inmutables.
- Los importes usan Prisma.Decimal y PostgreSQL valida totales, moneda y valores no negativos.
- El catálogo administrativo retira Product y ProductVariant mediante soft delete.
- RESERVATION, RELEASE, SALE, stock de proveedor, fingerprint y handoff HMAC ya estaban cubiertos.

### Corregido

- La FK simple de Order.addressId no comprobaba que Address perteneciera a Order.customerId.
- La FK compuesta de OrderItem a ProductVariant usaba SET NULL y podía borrar productId junto con variantId.
- PostgreSQL no impedía shippingPendingQuote o Address en pedidos PICKUP.
- Se agregó mapeo de dominio para ORDER_ADDRESS_CUSTOMER_MISMATCH y pruebas directas de PostgreSQL.

## 2. Address ownership

Address declara la clave candidata única (customerId, id). Order referencia esa pareja mediante una única relación compuesta opcional:

    Order.customerId + Order.addressId
                  ↓
    Address.customerId + Address.id

Si addressId es NULL, la FK permite PICKUP. Si contiene un valor, PostgreSQL exige que el Customer coincida. La migración ejecuta primero un precheck y se detiene si detecta ownership inconsistente; no reasigna direcciones.

## 3. ProductVariant delete policy

Product y ProductVariant mantienen soft delete como baja comercial. La política histórica queda diferenciada:

- Un Product simple eliminado físicamente puede dejar OrderItem.productId en NULL; el snapshot sobrevive.
- Una ProductVariant referenciada usa RESTRICT y no puede eliminarse físicamente.
- El soft delete de ProductVariant continúa permitido y la relación histórica sigue legible.
- El borrado físico de un Product que contiene una variante histórica también queda bloqueado indirectamente para preservar esa variante.

No existe endpoint administrativo de hard delete de variantes.

## 4. Prisma

Address incorpora unique compuesto; Order modela la relación opcional por customerId y addressId; el lado hijo tiene índice compuesto. OrderItem cambia únicamente el onDelete de la relación de variante a Restrict. No se redujo ningún snapshot.

## 5. Migración

La migración 20260903090000_phase5_1_order_integrity_hardening:

1. aborta ante datos Address/Customer inconsistentes;
2. crea la clave candidata de Address;
3. reemplaza la FK simple por la FK compuesta con RESTRICT;
4. agrega el índice hijo;
5. cambia la FK histórica de ProductVariant a RESTRICT;
6. agrega un CHECK compatible con shipping futuro: solo restringe PICKUP a shipping cero, sin cotización pendiente y sin Address.

DELIVERY puede evolucionar a una tarifa positiva y shippingPendingQuote=false.

## 6. Services

OrderService mantiene la validación en profundidad de ownership y produce ORDER_ADDRESS_CUSTOMER_MISMATCH con HTTP 422 si la dirección no pertenece al Customer. También mapea la FK compuesta si una ruta futura alcanza PostgreSQL. Serializable, retry y resolución de checkout no cambiaron.

## 7. APIs

No se agregaron endpoints ni pantallas. Las APIs públicas y administrativas conservan sus contratos. Checkout DELIVERY sigue creando Address y OrderAddress dentro de la misma transacción; GET administrativo continúa leyendo snapshots sin exponer secretos.

## 8. Snapshots

Se verificó que cambios posteriores en Product.name, Product.sku, Product.price, ProductVariant.name, ProductVariant.sku, priceOverride y Address no alteran OrderItem ni OrderAddress. Un soft delete de Variant tampoco rompe la lectura administrativa del pedido.

## 9. Inventory regressions

Se conservan fuente única por línea, reserva atómica de OWN_STOCK, RELEASE al cancelar y SALE al entregar. SUPPLIER_STOCK no modifica InventoryStock ni supplierStock.

## 10. Idempotency regressions

requestId continúa único. Repetir la misma solicitud devuelve el mismo ORD, handoffToken y whatsappUrl sin crear otra reserva. La FK compuesta de Address no altera los reintentos de DELIVERY.

## 11. Tests

Las pruebas nuevas cubren ownership correcto e incorrecto a nivel PostgreSQL, PICKUP sin Address, DELIVERY válido, consistencia de shipping, Address soft/hard delete, snapshots de Product/Variant, Variant soft/hard delete, lectura histórica y timestamps. Las regresiones existentes cubren inventario, concurrencia, proveedor, idempotencia, handoff y RBAC.

## 12. Gates

- Prisma format y validate: OK.
- Prisma Client generate: OK.
- Deploy, seed y migrate status sobre la base principal: OK; siete migraciones y esquema actualizado.
- ESLint, Prettier y TypeScript estricto: OK.
- Vitest completo: 11 archivos y 80 pruebas aprobadas.
- Playwright completo: 19 escenarios aprobados.
- Build Nuxt/Nitro de producción: OK.

## 13. Base vacía

Se creó la base temporal ajksolutions_phase51_verify_20260903 en PostgreSQL local. Las siete migraciones se aplicaron desde cero, el seed terminó correctamente y los 6 archivos con 41 pruebas de integración quedaron verdes. La base temporal se eliminó al finalizar. No se utilizó Docker.

## 14. Deuda técnica

- Rate limit en memoria para una sola instancia.
- Reservas sin TTL.
- Shipping todavía coordinado fuera del sistema.
- Prisma 7 con el adaptador pg reporta violaciones CHECK como P2039; el dominio evita depender de ese código en la ruta pública.
- Product físico con una Variant histórica no puede borrarse físicamente; debe conservarse por soft delete.

## 15. Estado

    FASE 5.1
    CERRADA

No se implementó Fase 6.
