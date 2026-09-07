# Implementación de la Fase 6

> Documento histórico. El inventario interno de claves, el cifrado y el fulfillment descritos aquí fueron
> retirados por la Fase 6.2 y TD-026. No representan la arquitectura vigente.

## 1. Alcance

Se implementaron productos DIGITAL y LICENSE sobre Product, Cart, Checkout, Order y OrderItem existentes. No se creó un flujo comercial paralelo. La fase incluye inventario cifrado de claves, reserva concurrente, fulfillment manual, cancelación, RBAC, administración y presentación pública.

## 2. Modelos

Prisma incorpora DigitalLicense, DigitalLicenseHistory y DigitalFulfillment; además agrega OrderItem.productTypeSnapshot. Product, ProductVariant, Supplier, OrderItem y User poseen relaciones explícitas. AvailabilitySource se amplió con DIGITAL_LICENSE y DIGITAL.

DigitalLicense usa FK compuesta (productId, variantId) hacia ProductVariant, unicidad para licenseCode y fingerprint, RESTRICT para relaciones históricas e índices por producto, variante, estado, pedido, proveedor, expiración y soft delete.

## 3. Crypto

server/utils/license-crypto.ts implementa AES-256-GCM con nonce aleatorio de 12 bytes. El envelope tiene forma v1:nonce:ciphertext:tag, con componentes binarios base64url. La clave privada se valida como base64 canónico de exactamente 32 bytes. Un tag inválido o envelope manipulado produce LICENSE_DECRYPT_FAILED.

## 4. Fingerprint

La deduplicación usaba un secreto HMAC independiente de la clave de cifrado. La única normalización era trim; no se cambiaban mayúsculas, guiones ni espacios internos. Este mecanismo fue retirado en Fase 6.2.

## 5. License lifecycle

Los estados son AVAILABLE, RESERVED, ASSIGNED, REVOKED y EXPIRED. El alta/importación produce AVAILABLE; checkout reserva; fulfillment asigna; cancelación libera únicamente RESERVED; revocación está bloqueada mientras la licencia está reservada. ASSIGNED nunca vuelve al pool por cancelar el pedido.

DigitalLicenseHistory registra CREATED, IMPORTED, UPDATED, RESERVED, RELEASED, ASSIGNED y REVOKED con usuario, OrderItem y nota cuando corresponde.

## 6. Availability

PHYSICAL conserva OWN_STOCK/SUPPLIER_STOCK. LICENSE calcula disponibilidad con claves AVAILABLE no eliminadas y no vencidas, por producto y variante. DIGITAL activo se considera disponible. El DTO público de licencias selecciona como máximo una fila para resolver un booleano y nunca expone cantidad exacta, costo, proveedor, estado interno, ciphertext o fingerprint.

## 7. Checkout integration

Los productos FIXED DIGITAL y LICENSE pueden entrar al carrito; CONTACT continúa rechazado. El servidor resuelve tipo, precio, IVA y disponibilidad. LICENSE exige N claves para cantidad N. El fingerprint canónico v2 incluye productType, AvailabilitySource, delivery type, cantidad e importes.

El email es obligatorio cuando existe al menos un item digital. Un checkout exclusivamente digital exige DeliveryType.DIGITAL. DIGITAL no crea Address, shipping ni cotización.

## 8. Mixed Orders

Un pedido mixto usa el mismo Order y la misma lista de OrderItem. Si contiene PHYSICAL exige PICKUP o DELIVERY; si todos los items son digitales exige DIGITAL. Los snapshots preservan tipo y fuente de disponibilidad de cada línea.

## 9. Reservation

Dentro de la transacción Serializable de creación, cada línea LICENSE bloquea candidatos AVAILABLE mediante FOR UPDATE SKIP LOCKED, orden determinista y límite igual a quantity. Solo si obtiene el conjunto completo actualiza las claves a RESERVED, vincula OrderItem, crea histories y DigitalFulfillment. Una insuficiencia lanza INSUFFICIENT_LICENSE_STOCK y revierte Order, reservas físicas y digitales.

## 10. Cancellation

La cancelación mantiene la liberación física existente. Para items digitales cambia fulfillment pendiente/reservado/ready/failed a CANCELLED. Las licencias RESERVED vuelven a AVAILABLE, limpian OrderItem y reservedAt, y generan history/audit. Las ASSIGNED permanecen asignadas.

## 11. Fulfillment

Cada LICENSE nace con fulfillment RESERVED y método LICENSE_KEY; cada DIGITAL nace PENDING y método EMAIL. POST /api/admin/orders/:orderId/items/:itemId/fulfill exige un estado operativo permitido. Para LICENSE asigna en conjunto todas las claves reservadas y marca DELIVERED; para DIGITAL marca entrega con método y usuario. Order DELIVERED queda bloqueado si falta fulfillment.

## 12. Admin

/admin/licencias ofrece búsqueda, estado, alta individual, preview de importación e importación atómica. /admin/licencias/:id muestra máscara, producto, variante, proveedor, expiración e historial. Reveal es individual y temporal; no existe exportación masiva ni bulk decrypt.

El detalle de pedido muestra fulfillment y licencias enmascaradas, y permite completar la entrega. Los endpoints implementados son list/create/detail/update, import preview/commit, reveal, revoke y fulfill.

## 13. RBAC

Se agregaron licenses.view/create/update/import/reveal/assign/revoke y digitalFulfillment.view/manage. SUPER_ADMIN y ADMIN poseen el conjunto completo. SALES puede ver licencias y gestionar fulfillment/asignación. SUPPORT no obtiene reveal ni gestión de claves. Se conserva temporalmente licenses.manage por compatibilidad.

## 14. Audit

Se auditan LICENSE_CREATED, LICENSES_IMPORTED, LICENSE_UPDATED, LICENSE_REVEALED, LICENSE_REVOKED, LICENSE_RESERVED, LICENSE_RELEASED y DIGITAL_FULFILLMENT_DELIVERED. Los eventos contienen IDs, cantidades, estados, máscara o motivo; nunca incluyen plaintext, ciphertext ni fingerprint.

## 15. Security

Los listados/selects seguros excluyen por construcción encryptedValue y licenseFingerprint. Reveal exige permiso dedicado, razón de 3 a 500 caracteres, límite de 10 solicitudes por usuario/IP cada 10 minutos y headers no-store/private y Pragma no-cache. No se registran cuerpos de claves en logs ni auditoría.

.env.example declara secretos vacíos e instrucciones de generación; la instalación local posee secretos aleatorios fuera del control de versiones.

## 16. Tests

tests/unit/digital-licenses-phase6.test.ts cubre roundtrip AES-GCM, nonce aleatorio, tampering, secretos ausentes, HMAC sensible a mayúsculas, trim, last4, máscara y schemas DIGITAL.

tests/integration/digital-licenses-phase6.test.ts valida PostgreSQL real: pedido digital sin Address/shipping, reserva, fulfillment, ASSIGNED persistente tras cancelación y liberación de RESERVED con fulfillment CANCELLED.

tests/e2e/digital-licenses-phase6.spec.ts verifica el inventario administrativo enmascarado, ausencia de campos criptográficos en el JSON y el recorrido público producto LICENSE → carrito → checkout DIGITAL → confirmación sin plaintext.

## 17. Gates

Todos los gates cerraron correctamente: Prisma format/generate; 8 migraciones aplicadas; seed idempotente; ESLint; Nuxt typecheck; build de producción; 13 archivos/86 pruebas Vitest; 19 E2E de regresión más 2 E2E específicos de Fase 6. La migración 20260903180000_phase6_digital_products_licenses se aplicó sobre PostgreSQL local sin Docker.

La base temporal vacía ajksolutions_phase6_verify_20260903 recibió desde cero las ocho migraciones y el seed; luego ejecutó 7 archivos/43 pruebas de integración. Se eliminó después de validar.

## 18. Deuda

No se implementa transporte real de correo ni descarga de archivos: la entrega es administrativa y registra su método. La rotación/re-encryption de envelopes v2+, custodia externa de secretos, cleanup distribuido del rate limit y métricas operativas quedan para infraestructura futura. No existe exportación de claves por diseño.

## 19. Estado

Fase 6 implementada y verificada sobre la arquitectura existente, con migración incremental, PostgreSQL local y sin iniciar componentes de Fase 7.
