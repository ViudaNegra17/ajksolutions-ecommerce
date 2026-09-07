# Implementación de la Fase 6.1

> Documento histórico. La política Buy Now continúa vigente, pero desde Fase 6.2 aplica a DIGITAL; los
> modelos y controles de claves/fulfillment descritos aquí fueron retirados por TD-026.

## 1. Hallazgos

La Fase 6 ya tenía cifrado, fingerprints opacos, reserva transaccional, fulfillment y Order unificado, pero
permitía LICENSE en el carrito, cantidades mayores a uno y pedidos mixtos. La ruta pública /licencias todavía
era un placeholder. PostgreSQL tampoco comprobaba que DigitalLicense y DigitalFulfillment coincidieran con el
tipo, producto y variante del OrderItem relacionado, y DigitalLicenseHistory.orderItemId no tenía FK real.

## 2. Buy Now policy

LICENSE usa compra directa individual: una compra equivale a una licencia, quantity siempre es uno y no existe
mezcla con otras líneas. El servidor responde LICENSE_QUANTITY_INVALID con HTTP 422 para cantidades distintas
de uno y LICENSE_BUY_NOW_REQUIRED con HTTP 422 para pedidos con LICENSE y otras líneas. PHYSICAL y DIGITAL
conservan el carrito existente. La decisión quedó registrada como TD-025.

## 3. License catalog

/licencias consulta el mismo read model público con productType=LICENSE, por lo que sólo publica Product activos,
no eliminados y pertenecientes a categorías públicas. Las tarjetas muestran precio y disponibilidad booleana,
usan el CTA Comprar ahora y nunca exponen conteos, estados internos, proveedor, costo, ciphertext, fingerprint
ni claves. /licencias/[slug] valida server-side que el producto sea LICENSE.

## 4. Direct checkout

/licencias/[slug]/comprar reutiliza POST /api/checkout/preview y POST /api/orders. No existe otro backend,
Customer ni modelo de pedido. La pantalla solicita nombres, apellidos, email y WhatsApp, usa DeliveryType.DIGITAL,
no crea Address, mantiene shipping en cero y termina en la confirmación ORD y el handoff existente de WhatsApp.
El mensaje usa el encabezado NUEVA COMPRA DE LICENCIA sin incluir secretos.

## 5. Quantity rule

La UI no renderiza selector de cantidad. useBuyNowStore sólo puede representar quantity=1 y el servicio vuelve
a validar la cantidad usando el tipo canónico obtenido de PostgreSQL. Preview no reserva; create vuelve a
resolver catálogo y disponibilidad dentro de la transacción Serializable antes de reservar exactamente una clave.

## 6. Cart migration

useCartStore rechaza LICENSE en addItem. La persistencia subió a versión 2 y hydrate acepta la versión anterior
para retirar únicamente líneas LICENSE legadas, preservando PHYSICAL y DIGITAL y reescribiendo el payload
saneado. La intención de compra directa usa sessionStorage independiente y contiene sólo productId, variantId,
productType LICENSE y quantity uno; el navegador nunca es fuente de precio, stock o identidad.

## 7. DigitalLicense ↔ OrderItem integrity

El trigger digital_license_order_item_integrity exige que todo orderItemId no nulo apunte a un OrderItem con
productTypeSnapshot LICENSE, el mismo productId y la misma variante, incluido el caso null. Un trigger inverso
sobre OrderItem impide romper relaciones existentes al modificar producto, variante o snapshot. La señal
identificable es LICENSE_ORDER_ITEM_MISMATCH y los servicios la convierten en un error de dominio no 500.

## 8. DigitalFulfillment integrity

El trigger digital_fulfillment_order_item_integrity impide relacionar fulfillment con PHYSICAL. LICENSE exige
LICENSE_KEY; DIGITAL admite sus métodos digitales pero rechaza LICENSE_KEY. El trigger inverso de OrderItem
protege la regla ante cambios del padre. La señal DIGITAL_FULFILLMENT_ITEM_INVALID también se mapea a HTTP 409.
El estado de fulfillment continúa separado del estado comercial del Order.

## 9. Delete policy

DigitalFulfillment.orderItem cambió de CASCADE a RESTRICT. Un OrderItem con evidencia de entrega digital no puede
eliminarse físicamente sin una decisión explícita sobre esa evidencia. DigitalLicense ya mantenía RESTRICT hacia
OrderItem. Las bajas comerciales de catálogo continúan mediante soft delete.

## 10. History FK

DigitalLicenseHistory.orderItemId ahora posee una relación Prisma y una FK PostgreSQL real hacia OrderItem.id con
ON DELETE RESTRICT y ON UPDATE CASCADE. OrderItem expone la relación inversa licenseHistory. El historial de
licencias conserva además su FK RESTRICT hacia DigitalLicense.

## 11. Migration

20260903210000_phase6_1_license_buy_now_integrity es una migración nueva; la migración de Fase 6 no fue alterada.
Antes de crear FKs y triggers ejecuta prechecks para asociaciones de licencia, fulfillment e historiales
huérfanos. Si encuentra inconsistencias aborta con un error identificable y no corrige datos silenciosamente.
La base principal PostgreSQL tiene las nueve migraciones aplicadas.

## 12. Tests

Las pruebas unitarias cubren rechazo al carrito, migración preservando items válidos, intención efímera y ausencia
de cantidad/carrito en la UI. Integración cubre quantity, mezcla, Order idempotente, última clave concurrente,
producto y variante cruzados, método LICENSE_KEY, PHYSICAL inválido y RESTRICT histórico. El E2E recorre
/licencias → detalle → Buy Now → checkout directo → ORD → WhatsApp, confirma que no visita /carrito, verifica
agotado y la redirección canónica.

## 13. Gates

- Prisma format, validate, generate, migrate deploy, seed y migrate status: aprobados.
- ESLint, Prettier y TypeScript estricto: aprobados.
- Vitest completo: 15 archivos y 96 pruebas aprobadas.
- Integración en base vacía: 8 archivos y 49 pruebas aprobadas.
- Playwright completo: 21 escenarios aprobados.
- Build Nuxt/Nitro de producción: aprobado.

## 14. Regressions

Siguen aprobados autenticación, RBAC, catálogo administrativo, inventario, catálogo público SSR, servicios,
tickets, carrito PHYSICAL/DIGITAL, checkout, direcciones, reservas físicas, cancelación, fulfillment digital,
admin de licencias, reveal protegido y handoffs. El sitemap usa /licencias/[slug] para LICENSE y evita su URL
duplicada bajo /productos; esa URL anterior redirige permanentemente a la canónica.

## 15. Debt

El rate limit continúa en memoria y está pensado para una sola instancia. La reserva no posee TTL. El fulfillment
y el pago continúan siendo operativos/manuales. El build Nitro en Windows es correcto pero lento por resolución
de dependencias. El warning deprecado del driver pg sobre consultas concurrentes pertenece a la dependencia y no
afecta el resultado de las pruebas.

## 16. Status

FASE 6.1 CERRADA. Se verificó sobre PostgreSQL local sin Docker. La base temporal
ajksolutions_phase61_verify_20260903_1930 fue creada, migrada desde cero, sembrada, probada y eliminada. No se
implementó ninguna parte de la Fase 7.
