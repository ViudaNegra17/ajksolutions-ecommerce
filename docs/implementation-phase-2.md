# Implementación de Fase 2

## Estado y alcance

Fase 2 implementada y verificada el 29 de agosto de 2026 sobre la base oficial de Fases 0–1. La entrega termina en catálogo administrativo, proveedores e inventario. No incluye carrito, checkout, pedidos, pagos, facturación, licencias completas, promociones, sincronización de proveedores, WhatsApp ni carga definitiva a R2.

La arquitectura conserva el flujo:

    Página/componente Nuxt
      → endpoint API
      → servicio de dominio
      → repositorio
      → Prisma
      → PostgreSQL

Ninguna página Vue accede directamente a Prisma.

## Persistencia

La migración 20260829175358_phase2_catalog_inventory agrega:

- Category: jerarquía ilimitada mediante parentId, orden, activación y soft delete.
- Brand y Supplier: datos comerciales, activación y soft delete.
- Product y ProductImage: producto comercial, SEO, precio, impuestos e imágenes ordenadas.
- Attribute, AttributeOption y CategoryAttribute: definición dinámica por categoría.
- ProductAttributeValue y ProductAttributeValueOption: valores relacionales y filtrables.
- ProductVariant y VariantAttributeValue: combinaciones sin duplicar productos.
- InventoryLocation, InventoryStock e InventoryMovement: inventario por ubicación y variante.
- SupplierProduct: costo, SKU, disponibilidad y plazo por proveedor.
- CodeSequence: secuencias comerciales seguras ante concurrencia.

Enums nuevos:

- ProductType: PHYSICAL, DIGITAL, LICENSE.
- PriceMode: FIXED, CONTACT.
- AttributeType: TEXT, NUMBER, BOOLEAN, SELECT, MULTISELECT.
- InventoryMovementType: INITIAL, PURCHASE, ADJUSTMENT_IN, ADJUSTMENT_OUT, SALE, RETURN, TRANSFER_IN, TRANSFER_OUT, RESERVATION, RELEASE.

Los importes usan Decimal; no se usa Float. PostgreSQL refuerza las reglas con constraints para precio FIXED/CONTACT, valores monetarios, stock no negativo, reservado no mayor al stock físico y cantidades válidas. Índices parciales garantizan una sola imagen principal y una sola existencia de producto simple por ubicación.

## Códigos comerciales

CodeSequence utiliza upsert más incremento atómico en PostgreSQL. Los códigos visibles no dependen de UUID ni de count + 1:

    PRD-000001
    SUP-000001
    VAR-0000001
    MOV-000000001

El UUID se conserva como identificador técnico.

## Precio e IVA

FIXED exige precio y un producto activo exige un valor mayor a cero. CONTACT persiste price = NULL; nunca utiliza cero como precio ficticio.

El seed crea tax.defaultRate y tax.pricesIncludeTaxDefault. SEED_DEFAULT_TAX_RATE permite configurar la tasa inicial. calculateProductPrice() opera con Prisma.Decimal y devuelve neto, impuesto y total para precios con impuesto incluido o precio base más impuesto.

## Atributos y variantes

Las especificaciones no son columnas rígidas de producto. Cada categoría define atributos, obligatoriedad y orden. El servidor valida pertenencia a la categoría, campos obligatorios, opciones válidas, tipo de valor y combinaciones no duplicadas.

Los atributos marcados como variant permiten generar el producto cartesiano de opciones. Cada variante conserva SKU, código comercial, precio opcional, estado e inventario propio. Un producto sin variantes usa inventario con variantId nulo.

## Inventario

El seed idempotente crea:

    LOC-000001 — BODEGA PRINCIPAL

InventoryStock almacena quantityOnHand y quantityReserved. La disponibilidad se calcula como quantityOnHand menos quantityReserved; no se persiste otro valor derivado y Product no tiene un campo stock como fuente de verdad.

Un ajuste sigue:

    POST /api/admin/inventory/adjust
      → InventoryService
      → transacción Serializable
      → bloqueo SELECT FOR UPDATE
      → actualización de InventoryStock
      → creación de InventoryMovement
      → creación de AuditLog

El servidor aplica signo según el tipo de movimiento y rechaza cualquier resultado negativo o inferior a la cantidad reservada. El frontend nunca reemplaza directamente quantityOnHand.

## Stock propio y de proveedores

Las fuentes permanecen separadas:

    Stock propio       → InventoryStock
    Stock proveedor    → SupplierProduct.supplierStock

La disponibilidad devuelve OWN_STOCK, SUPPLIER_STOCK u OUT_OF_STOCK, además de ambos totales. El stock externo no se suma ni se convierte en existencia física. La actualización del proveedor es manual en esta fase y actualiza lastCheckedAt.

## API administrativa

Todos los endpoints exigen sesión y permiso en servidor, validan con Zod y mantienen la respuesta { success, data }.

Categorías:

    GET/POST       /api/admin/categories
    GET/PUT/DELETE /api/admin/categories/:id
    GET            /api/admin/categories?tree=true

Marcas:

    GET/POST       /api/admin/brands
    GET/PUT/DELETE /api/admin/brands/:id

Proveedores:

    GET/POST       /api/admin/suppliers
    GET/PUT/DELETE /api/admin/suppliers/:id

Atributos:

    GET/POST       /api/admin/attributes
    GET/PUT/DELETE /api/admin/attributes/:id

Productos:

    GET/POST       /api/admin/products
    GET/PUT/DELETE /api/admin/products/:id
    GET            /api/admin/products/:id/availability

Inventario y configuración:

    GET  /api/admin/inventory
    POST /api/admin/inventory/adjust
    GET  /api/admin/inventory/movements
    GET  /api/admin/inventory/locations
    GET  /api/admin/catalog/settings

El listado de productos pagina y filtra en servidor por búsqueda, categoría, marca, proveedor, estado, destacado, modo de precio y existencia.

## Interfaz administrativa

Rutas implementadas:

    /admin/catalogo
    /admin/catalogo/categorias
    /admin/catalogo/marcas
    /admin/catalogo/proveedores
    /admin/catalogo/atributos
    /admin/catalogo/productos
    /admin/catalogo/productos/nuevo
    /admin/catalogo/productos/[id]
    /admin/catalogo/inventario

El formulario de producto se divide en General, Precio, Clasificación, Imágenes, Atributos, Variantes, Inventario, Proveedores y SEO. Los listados incluyen búsqueda, estados loading/empty/error, paginación, confirmación y toasts.

La tabla de productos muestra imagen, código, SKU, nombre, categoría, marca, precio o “Consultar”, stock propio, stock proveedor, estado y acciones.

## RBAC

Permisos agregados:

    categories.view/create/update/delete
    brands.view/create/update/delete
    suppliers.view/create/update/delete
    attributes.view/manage
    products.view/create/update/delete
    inventory.view/adjust

Matriz:

- SUPER_ADMIN: todos los permisos.
- ADMIN: administración completa de catálogo e inventario.
- SALES: lectura de productos, categorías, marcas, proveedores e inventario.
- SUPPORT: lectura de productos, categorías y marcas.

La navegación filtra opciones para la experiencia de usuario, pero la seguridad efectiva está en requirePermission() dentro de cada endpoint.

## Auditoría

Se registran creación, actualización y eliminación lógica de categorías, marcas, proveedores y productos; cambios de atributos; activación/desactivación; cambios de precio o modo; creación/actualización de relaciones con proveedores; y ajustes de inventario.

PRODUCT_PRICE_CHANGED guarda precios como texto decimal. INVENTORY_ADJUSTED se escribe en la misma transacción que la existencia y el movimiento.

## Seed

El seed:

- crea los 20 permisos granulares de Fase 2;
- sincroniza la matriz de los cuatro roles;
- crea o reactiva BODEGA PRINCIPAL;
- crea los dos settings fiscales;
- conserva el superadministrador configurado por entorno.

No se usa Docker. La ejecución verificada utiliza PostgreSQL local en localhost:5432 y la base ajksolutions_ecommerce.

## Verificación ejecutada

    Prisma migrate status  2 migraciones, esquema actualizado
    db:seed                correcto
    lint                   correcto
    typecheck              correcto
    unit                   9/9
    integration            4/4
    e2e                    5/5
    build                  correcto
    health/login           correctos mediante Playwright

Las pruebas cubren FIXED/CONTACT, normalización de valores numéricos del formulario a texto Decimal, IVA Decimal, slug, secuencias, variantes duplicadas, validación de inventario/proveedor, constraints reales, CRUD relacional, RBAC de SALES, login, render del formulario de nuevo producto, CRUD API de categoría/producto con precios numéricos, edición de precio, ajuste de inventario, disponibilidad y rechazo de stock negativo.

## Limitaciones conscientes

- Las imágenes se administran por URL; storageKey prepara R2, pero la carga pertenece a una fase futura.
- El stock de proveedor es manual; no existe sincronización externa.
- El modelo soporta múltiples ubicaciones, pero esta fase crea la inicial mediante seed; el CRUD de ubicaciones llegará cuando exista operación multi-bodega.
- El selector del modal de inventario carga las primeras 100 opciones activas. El listado principal sí pagina en servidor; una búsqueda remota será conveniente con catálogos grandes.
- Si una combinación de variante se elimina lógicamente y luego se intenta recrear como una fila nueva, la restricción histórica exige reactivarla o reutilizar su identificador.

## Próximo paso

La siguiente iteración recomendada es Fase 3 — Portal público y catálogo: Home, catálogo, detalle de producto, búsqueda, filtros, productos relacionados, disponibilidad y SEO. Esta fase no se implementó automáticamente.

## Actualización posterior — Fase 8.5

El alcance histórico anterior se conserva. Fase 8.5 reemplaza el ingreso manual de SKU/slug por
identificadores automáticos y URLs estables, añade barcode comercial y simplifica garantía/peso.
supplierSku continúa manual. Consulte [la implementación 8.5](implementation-phase-8-5-final-review.md).
