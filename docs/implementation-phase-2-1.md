# Implementación de Fase 2.1

## Estado y alcance

Fase 2.1 implementada el 30 de agosto de 2026 como hardening de integridad de la Fase 2. No agrega funcionalidades comerciales ni modifica la arquitectura:

    Nuxt → API → Service → Repository → Prisma → PostgreSQL

Se mantuvieron TD-005, TD-006, TD-007 y TD-008. La integridad compuesta incorporada se documentó como TD-009. PostgreSQL continúa ejecutándose localmente; no se agregó Docker.

## 1. Hallazgos

### Protecciones que ya existían

- Índice parcial de una imagen primaria por producto.
- Índice parcial de una existencia simple por ubicación y producto cuando variantId es NULL.
- Índice parcial de una relación simple por proveedor y producto cuando variantId es NULL.
- Unicidad de existencia y proveedor cuando existe variante.
- Checks para stock no negativo, reserva no negativa y reserva no mayor a existencia.
- Cantidades válidas en movimientos.
- Unicidad de combinación de variante por producto.
- Rechazo DB de categoría como su propio padre y detección de ciclos en Service.
- Soft delete y exclusión estándar de productos, categorías, marcas y proveedores eliminados.
- Inventario mediante transacción Serializable, SELECT FOR UPDATE, movimiento y auditoría atómicos.
- Secuencias comerciales mediante incremento atómico; nunca count + 1.

### Brechas corregidas

- Una variante de Product B podía referenciarse junto con Product A en stock, movimiento o proveedor.
- Una opción de Storage podía asociarse como si perteneciera a Color.
- Product y ProductVariant tenían unicidad separada de SKU, pero no global.
- SKU era sensible a mayúsculas y el nivel DB no normalizaba espacios.
- Un producto CONTACT podía conservar priceOverride en variantes.
- Los checks de precio admitían cero en registros inactivos o variantes.
- Valores de atributos no impedían todas las combinaciones de campos incompatibles con su tipo.
- Un ID de variante, opción o relación de proveedor podía intentar reutilizarse desde otra entidad.
- Marca o proveedor inactivo podía seleccionarse para una relación nueva.
- La disponibilidad podía consultar producto eliminado o stock de proveedor inactivo/eliminado.
- Recrear una combinación histórica de variante producía conflicto en lugar de reutilizar su fila.

## 2. Schema Prisma

Se añadieron claves únicas representativas para:

- ProductVariant(productId, id).
- AttributeOption(attributeId, id).
- ProductAttributeValue(id, attributeId).

Las relaciones de InventoryStock, InventoryMovement y SupplierProduct ahora referencian ProductVariant mediante productId y variantId.

ProductAttributeValueOption incorpora attributeId y utiliza dos relaciones compuestas:

- productAttributeValueId + attributeId hacia el valor del producto.
- attributeId + optionId hacia la opción.

VariantAttributeValue referencia igualmente attributeId + optionId.

Los índices parciales y triggers específicos de PostgreSQL permanecen en SQL porque Prisma no puede representarlos completamente.

## 3. Migración

Migración aplicada:

    20260830090000_phase2_1_integrity_hardening

Incluye:

- FKs compuestas producto-variante para stock, movimientos y proveedores.
- FKs compuestas atributo-opción para valores de producto y variante.
- Índices únicos necesarios para las claves referenciadas.
- Backfill seguro de ProductAttributeValueOption.attributeId.
- Normalización de SKU existentes a trim + uppercase.
- Checks de SKU no vacío.
- Triggers de SKU global con advisory lock transaccional.
- Precio FIXED y priceOverride estrictamente mayores a cero.
- Trigger inmediato para impedir override nuevo en CONTACT.
- Constraint trigger diferido para impedir que un producto cambie a CONTACT conservando overrides.

La migración conserva sin duplicar product_images_one_primary, inventory_stocks_simple_unique y supplier_products_simple_unique.

## 4. Services

- Zod normaliza SKU de producto y variantes a uppercase sin espacios exteriores.
- Zod rechaza SKU repetido dentro del producto.
- FIXED exige precio mayor a cero.
- CONTACT rechaza cualquier priceOverride.
- Los overrides FIXED deben ser nulos o mayores a cero.
- La validación de atributos controla pertenencia a categoría, obligatoriedad, opciones activas, duplicados y forma TEXT/NUMBER/BOOLEAN/SELECT/MULTISELECT.
- Cada variante debe usar exactamente una opción activa por atributo de variante asignado a la categoría.
- Se validan marcas y proveedores activos/no eliminados.
- Se valida pertenencia de IDs de variante y relaciones de proveedor al producto actualizado.
- Inventario utiliza el helper común de consistencia producto-variante.
- calculateEffectivePrice devuelve null para CONTACT y Prisma.Decimal para precio heredado u override FIXED.

## 5. Repositories

- Búsqueda preventiva de conflicto global de SKU.
- Consultas de pertenencia para variantes y relaciones de proveedor.
- Categorías de producto limitadas a activas y no eliminadas.
- Selectores del formulario limitados a categorías, marcas y proveedores activos.
- Actualización de opciones restringida al atributo propietario.
- Reactivación de la fila histórica de variante por productId + combinationKey, conservando su ID.
- Disponibilidad excluye productos eliminados y proveedores inactivos/eliminados.

## 6. API y errores

No se agregaron endpoints ni permisos. Los endpoints existentes conservan RBAC, Zod y auditoría.

Conflictos únicos continúan mapeándose a HTTP 409. Las violaciones de checks PostgreSQL identificadas por Prisma como P2004 se mapean a HTTP 422. Las validaciones de Service producen códigos específicos antes de escribir y los intentos fallidos no generan AuditLog.

## 7. Tests

Cobertura incorporada:

- FIXED/CONTACT y combinaciones de override.
- Normalización y duplicado de SKU.
- Precio efectivo con Prisma.Decimal.
- Forma de atributos y helper producto-variante.
- FKs compuestas en InventoryStock, InventoryMovement y SupplierProduct.
- Opción perteneciente a otro atributo en ambos modelos de valores.
- SKU cruzado Product/ProductVariant en ambas direcciones.
- Unicidad parcial con variantId NULL.
- Imagen primaria única.
- Combinación de variante única.
- Stock negativo y sobre-reserva.
- Override en producto CONTACT.
- Exclusión por soft delete.
- Reactivación de variante histórica.
- Códigos concurrentes únicos.
- Categoría auto-padre, ciclo indirecto y categoría eliminada rechazada por API.

Resultados:

    unit          13/13
    integration   13/13
    Vitest total  26/26
    e2e            6/6

## 8. Validaciones

    prisma validate             correcto
    db:deploy                   correcto
    db:seed                     correcto
    prisma migrate status       Database schema is up to date
    lint                        correcto
    format:check                correcto
    typecheck                   correcto
    test                        26/26
    test:e2e                     6/6
    build                       correcto
    /api/health                 correcto
    /admin/login                correcto
    /admin/catalogo/productos   correcto
    /admin/catalogo/inventario  correcto

## 9. Regresiones

No se detectaron regresiones funcionales. El CRUD de producto, actualización de precio, inventario, disponibilidad, autenticación y navegación administrativa continúan operativos.

## 10. Deuda técnica

- Los triggers e índices parciales son PostgreSQL-specific y deben revisarse expresamente si se cambia de motor.
- El rate limit de login en memoria y las demás limitaciones ya documentadas de Fases 0–2 permanecen; no pertenecen al hardening de catálogo.
- La advertencia deprecada de concurrencia del adaptador pg observada durante pruebas no afecta resultados, pero deberá revisarse antes de pg 9.

## 11. Estado final

    FASE 2
    CERRADA

Todos los criterios de integridad de Fase 2.1 quedaron cubiertos por validación de aplicación y constraints PostgreSQL.

## 12. Próximo paso

# FASE 3 — PORTAL PÚBLICO Y CATÁLOGO

Incluye posteriormente Home, catálogo, categorías, búsqueda, filtros, detalle de producto, variantes, disponibilidad, productos relacionados y SEO. Fase 3 no fue implementada en esta entrega.
