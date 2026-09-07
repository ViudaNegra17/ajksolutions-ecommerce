# Implementación de la Fase 6.2

## 1. Motivo de simplificación

El negocio entrega licencias y códigos manualmente por WhatsApp. Mantener claves, cifrado, reservas y
fulfillment interno añadía complejidad sin representar la operación real. La fase retira esa infraestructura y
conserva el pipeline comercial compartido.

## 2. Regla comercial

En V1, DIGITAL significa producto comercializado mediante Buy Now, cantidad uno, Order, WhatsApp y entrega
manual fuera del sistema. No se almacenan, cifran, reservan, revelan ni asignan claves.

## 3. ProductType

ProductType contiene únicamente PHYSICAL y DIGITAL. AvailabilitySource contiene OWN_STOCK, SUPPLIER_STOCK y
DIGITAL. La UI administrativa presenta DIGITAL como “Digital / Licencia”.

## 4. Migración LICENSE → DIGITAL

La migración 20260903223000_phase6_2_simplify_digital_domain convierte Product.productType y
OrderItem.productTypeSnapshot de LICENSE a DIGITAL, y AvailabilitySource DIGITAL_LICENSE a DIGITAL antes de
recrear los enums PostgreSQL. Los Orders y snapshots históricos permanecen legibles.

## 5. Eliminación DigitalLicense

Se eliminaron DigitalLicense, DigitalLicenseHistory, repositorio, servicio, schemas, endpoints de
alta/importación/reveal/revoke y sus relaciones Prisma. No existe sustituto ni exportación automática de
plaintext.

## 6. Eliminación DigitalFulfillment

Se retiraron DigitalFulfillment, el endpoint administrativo fulfill, sus triggers y funciones. DELIVERED ya no
depende de un estado paralelo. La entrega manual se refleja operativamente con Order, historial y notas.

## 7. Crypto removal

Se eliminaron los helpers AES/HMAC de licencias, rate limit de reveal, runtime config, variables de ejemplo y
pruebas criptográficas. Los secretos de checkout y handoff de WhatsApp continúan porque protegen Order.

## 8. RBAC cleanup

Se retiraron todos los permisos licenses.* y digitalFulfillment.*. El seed elimina idempotentemente esos
Permission y sus RolePermission legacy antes de reconciliar la matriz vigente.

## 9. Admin cleanup

Se eliminaron /admin/licencias, su navegación, formularios de claves y secciones de fulfillment/reveal en el
pedido. Los digitales se crean y editan en /admin/catalogo/productos; no pueden ajustarse mediante inventario.

## 10. Public license catalog

Esta superficie fue reemplazada por la unificación final: /productos publica PHYSICAL y DIGITAL. /licencias
existe únicamente como redirect permanente de compatibilidad. Un DIGITAL activo y no eliminado se considera
disponible sin tablas de stock digital.

## 11. Buy Now

useBuyNowStore persiste exclusivamente DIGITAL, quantity=1 y subió a versión 2. La CTA DIGITAL es Comprar ahora
y abre /productos/[slug]/comprar. CONTACT conserva consulta comercial y no genera pedido directo.

## 12. Checkout

/productos/[slug]/comprar reutiliza POST /api/checkout/preview y POST /api/orders. DIGITAL exige una sola línea,
quantity uno, email, WhatsApp y DeliveryType.DIGITAL. Usa addressId NULL, shipping 0 y
shippingPendingQuote=false.

## 13. Orders

Crear DIGITAL genera Customer, Order, OrderItem, OrderStatusHistory y Audit. No genera Address,
InventoryMovement, reserva, licencia ni fulfillment. DIGITAL_QUANTITY_INVALID y DIGITAL_BUY_NOW_REQUIRED
responden HTTP 422. El retry conserva un Order y un OrderItem.

## 14. SEO

/productos/[slug] es canonical para PHYSICAL y DIGITAL. El sitemap publica ambos tipos bajo /productos; las
rutas /licencias redirigen permanentemente y nunca son indexables como contenido duplicado.

## 15. Migration safety

El primer paso comprueba digital_licenses. Si existe una fila aborta con
PHASE6_2_DIGITAL_LICENSE_DATA_REQUIRES_MANUAL_BACKUP y exige backup/revisión manual; nunca borra claves
silenciosamente. En la base local se verificaron cero filas antes del deploy. La migración retira triggers,
funciones, tablas y tipos solo después del precheck y las transformaciones históricas. El precheck también se
probó en una base temporal con una licencia artificial: abortó con el identificador previsto y no ejecutó el
desmontaje.

## 16. Tests

Unit cubre carrito PHYSICAL-only, migración legacy, Buy Now DIGITAL, quantity uno, ProductType, disponibilidad,
CTA y SQL seguro. Integración cubre preview/create, ausencia de Address/tablas/stock, errores de cantidad y
mezcla, CONTACT, idempotencia y cancelación. E2E cubre alta administrativa DIGITAL, /licencias, compra directa,
ORD, WhatsApp, ausencia de carrito y canonical.

## 17. Gates

Prisma format/validate/generate, migrate deploy/status y seed idempotente aprobaron sobre PostgreSQL local. La
base principal registra 10 migraciones aplicadas; el producto LICENSE existente quedó convertido a DIGITAL.
Una base temporal vacía aplicó las 10 migraciones y superó 44/44 pruebas de integración. También aprobaron:
lint, Prettier check, typecheck, 90/90 pruebas Vitest en 13 archivos, 22/22 pruebas Playwright y el build Nuxt
de producción.

La auditoría posterior confirmó ProductType=PHYSICAL,DIGITAL,
AvailabilitySource=OWN_STOCK,SUPPLIER_STOCK,DIGITAL, cero tablas/funciones/triggers digitales legacy y cero
permisos licenses.* o digitalFulfillment.*. La búsqueda de código activo no encontró referencias obsoletas; las
únicas menciones conservadas están en migraciones/documentación histórica, pruebas negativas y la limpieza
idempotente del seed.

## 18. Regressions

PHYSICAL conserva carrito, checkout, reserva, RELEASE al cancelar y SALE al entregar. Servicios/tickets,
autenticación, RBAC, catálogo, proveedores, SEO y handoff mantienen sus contratos. DIGITAL nunca modifica
quantityReserved.

## 19. Debt

Pago, facturación, email automático, customer portal, descargas y automatización de entrega quedan fuera. Si el
negocio vuelve a requerir inventario de claves se diseñará una fase nueva; no se conserva infraestructura muerta.

## 20. Status

Fase 6.2 implementada y verificada sobre PostgreSQL local sin Docker. La arquitectura queda detenida antes de
Fase 7.

# Corrección posterior de seguridad de migración

## 1. Problema detectado

El precheck original verificaba únicamente digital_licenses, aunque la misma migración también eliminaba
digital_license_history y digital_fulfillments.

## 2. Riesgo de pérdida de fulfillment

Un producto DIGITAL de Fase 6 podía tener DigitalFulfillment sin DigitalLicense. Por tanto,
digital_licenses=0 no demostraba que no existiera evidencia operativa en digital_fulfillments.

## 3. Corrección SQL

Como Fase 6.2 continúa sin publicarse y Fase 7 no ha iniciado, se corrigió la migración
20260903223000_phase6_2_simplify_digital_domain. El bloque DO inicial usa to_regclass y consultas dinámicas
para comprobar las tres tablas antes del primer DROP, UPDATE o reconstrucción de enum. No se agregó Fase 6.3
ni se cambió el modelo comercial.

## 4. Prechecks

Los abortos estables son:

- digital_license_history:
  PHASE6_2_DIGITAL_LICENSE_HISTORY_REQUIRES_MANUAL_REVIEW.
- digital_fulfillments:
  PHASE6_2_DIGITAL_FULFILLMENT_DATA_REQUIRES_MANUAL_REVIEW.
- digital_licenses:
  PHASE6_2_DIGITAL_LICENSE_DATA_REQUIRES_MANUAL_BACKUP.

History se comprueba primero porque una fila válida requiere también una licencia; así conserva un diagnóstico
específico. Ningún caso borra, transforma ni interpreta datos automáticamente.

## 5. Test digital_licenses

Una base temporal hasta F6.1 recibió una licencia AVAILABLE válida. F6.2 abortó con el código de backup y se
verificó que las tres tablas y los enums legacy continuaban presentes.

## 6. Test digital_fulfillments

Una base temporal hasta F6.1 recibió un Product DIGITAL, Order, OrderItem y DigitalFulfillment PENDING/MANUAL,
sin DigitalLicense. F6.2 abortó con el código de revisión de fulfillment; la fila, las tablas y los enums
permanecieron intactos.

## 7. Test history

Una base temporal recibió Product LICENSE, DigitalLicense y DigitalLicenseHistory CREATED válidos. El precheck
de history abortó antes del desmontaje y conservó el schema legacy completo.

## 8. Empty migration

Con las tres tablas vacías, la migración terminó correctamente: eliminó las tablas legacy y dejó ProductType
con PHYSICAL/DIGITAL y AvailabilitySource con OWN_STOCK/SUPPLIER_STOCK/DIGITAL.

## 9. Data migration

La prueba exitosa incluyó Product LICENSE, Order y OrderItem históricos. Después de F6.2, producto y snapshot
quedaron DIGITAL, DIGITAL_LICENSE quedó DIGITAL y tanto Order como OrderItem conservaron exactamente una fila.

## 10. Prisma final

El schema Prisma no reintroduce DigitalLicense, DigitalLicenseHistory, DigitalFulfillment, LICENSE ni
DIGITAL_LICENSE. La validación de Product impide DIGITAL con manageStock=true y las pruebas de servicio
confirman que el flujo digital no crea InventoryStock.

## 11. Gates

Aprobaron con pnpm: prisma format, prisma validate, db:generate, db:deploy, db:seed, prisma migrate status,
lint, format:check, typecheck, 90/90 pruebas Vitest, 22/22 pruebas Playwright y build Nuxt de producción.

## 12. Base vacía

La base temporal ajksolutions_phase62_empty_correction aplicó las 10 migraciones completas, ejecutó el seed y
superó 44/44 pruebas de integración. Se eliminó al finalizar.

## 13. Abort safety

scripts/verify-phase6-2-migration.mjs reproduce los tres abortos y el camino exitoso en bases aisladas. Además,
la prueba unitaria comprueba que el bloque de precheck termina antes de la primera sentencia destructiva. La
base principal ya había aplicado la versión inicial; la auditoría previa registró cero filas en las tres tablas,
por lo que no hubo pérdida local. Se reconcilió únicamente su checksum Prisma, sin reset ni cambios en datos
comerciales.

## 14. Estado

FASE 6.2 CERRADA DEFINITIVAMENTE. No se inició Fase 7.

# Unificación final del catálogo público

## 1. Motivo

PHYSICAL y DIGITAL son Product y no requieren dominios públicos paralelos. Se eliminó la redundancia entre
/productos y /licencias sin modificar ProductType ni el pipeline de Order.

## 2. Navegación final

El header y el menú móvil muestran Productos y Servicios, sin Licencias como opción principal. El footer y la
home enlazan productos digitales hacia /productos. “Licencias” sigue permitido como texto comercial.

## 3. Catálogo unificado

/productos utiliza el endpoint público existente y lista PHYSICAL y DIGITAL con los mismos filtros, categorías,
marcas, atributos y búsqueda. Category organiza comercialmente software o licencias sin reintroducir LICENSE.

## 4. CTA por ProductType

Una tarjeta PHYSICAL FIXED sin variantes y disponible permite Agregar al carrito; con variantes abre el detalle
para elegir opciones. DIGITAL FIXED muestra Comprar ahora. CONTACT muestra Consultar precio. La resolución está
centralizada y probada unitariamente.

## 5. DIGITAL Buy Now

/productos/[slug] renderiza DIGITAL sin cantidad, stock ni proveedor y ofrece Comprar ahora.
/productos/[slug]/comprar valida el read model público, exige DIGITAL FIXED y reutiliza preview, orders,
quantity=1, DeliveryType.DIGITAL y WhatsApp.

## 6. PHYSICAL Cart

PHYSICAL conserva variantes, disponibilidad, cantidad operativa y Cart. El store continúa rechazando DIGITAL.
Un PHYSICAL que intenta abrir /productos/[slug]/comprar recibe 404 y no puede omitir el carrito.

## 7. Legacy redirects

Middleware Nitro responde 301 preservando query string:

- /licencias → /productos.
- /licencias/[slug] → /productos/[slug].
- /licencias/[slug]/comprar → /productos/[slug]/comprar.

Las páginas SSR duplicadas bajo app/pages/licencias fueron eliminadas.

## 8. SEO canonical

La única canonical de cualquier Product es /productos/[slug]. El JSON-LD sigue usando Product; DIGITAL FIXED
puede publicar Offer y CONTACT no inventa precio ni Offer.

## 9. Sitemap

El sitemap incluye /productos y todos los Product públicos bajo /productos/[slug], sin entradas /licencias. Los
redirects legacy tampoco se publican en sitemap.

## 10. Tests

Unit cubre CTA PHYSICAL/DIGITAL/CONTACT y Cart PHYSICAL-only. E2E cubre catálogo unificado, detalle y Buy Now
DIGITAL, rechazo de checkout directo PHYSICAL, los tres redirects 301, canonical, sitemap, búsqueda, Order y
WhatsApp sin visitar /carrito. También comprueba detalle y checkout DIGITAL en viewport móvil de 390×844.

## 11. Gates

Aprobaron lint, format:check, typecheck, 91/91 pruebas Vitest, 25/25 pruebas Playwright y build Nuxt de
producción. El schema Prisma y las 10 migraciones permanecen sin cambios de modelo o base de datos por este
ajuste.

## 12. Estado

Catálogo público unificado en /productos. /licencias queda únicamente como compatibilidad 301. Fase 6.2
permanece cerrada y no se inició Fase 7.
