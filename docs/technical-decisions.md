# Decisiones técnicas

## TD-001 — Prisma estable antes que Prisma 8 RC

**Fecha:** 2026-08-28  
**Estado:** aceptada temporalmente

La arquitectura objetivo especifica Prisma 8 estable. La consulta del registro npm durante la inicialización encontró `prisma@8.0.0-rc.12`, mientras que la línea estable disponible y coherente entre CLI, cliente y adaptador PostgreSQL fue 7.10.0. Además, el árbol del RC falló al instalar una dependencia beta de infraestructura.

Se fijan `prisma`, `@prisma/client` y `@prisma/adapter-pg` en 7.10.0. No se usa `latest` ni rangos. La migración a Prisma 8 debe realizarse cuando exista un release estable en npm, ejecutando generación, migraciones, tests y build completos.

## TD-002 — Typecheck separado del bundle en Windows

**Fecha:** 2026-08-28  
**Estado:** aceptada

`vite-plugin-checker`, activado por `typescript.typeCheck`, interpreta incorrectamente la ruta local que contiene un espacio y genera rutas de `tsconfig.json` inexistentes. Nuxt conserva TypeScript estricto, pero la verificación se ejecuta como gate independiente mediante `pnpm typecheck`; el bundle no repite ese proceso.

## TD-003 — Rate limit de login en memoria

**Fecha:** 2026-08-28  
**Estado:** aceptada para Fase 1

La primera versión se despliega como monolito de una instancia. El contador por IP reduce ataques básicos sin introducir infraestructura adicional. Antes de escalar horizontalmente se reemplazará por un almacén compartido, preferentemente Redis.

## TD-004 — Cliente Prisma externalizable por Nitro

**Fecha:** 2026-08-28  
**Estado:** aceptada temporalmente

Se usa el generador `prisma-client-js` para consumir el cliente desde `@prisma/client`. En Windows, Nitro 2.13 reescribe `import.meta.url` del generador `prisma-client` cuando su salida local se integra en un chunk y produce el placeholder inválido `file:///_entry.js`. El paquete externo conserva su contexto de módulo y permite arrancar el artefacto Node. Se revisará al actualizar Nitro/Prisma.

## TD-005 — Stock propio separado de disponibilidad de proveedores

**Fecha:** 2026-08-29  
**Estado:** aceptada

InventoryStock representa únicamente existencia física por ubicación. SupplierProduct.supplierStock representa disponibilidad externa manual y nunca se suma al stock físico. El servicio conserva ambos totales y comunica la fuente comercial.

## TD-006 — Inventario multiubicación y movimientos transaccionales

**Fecha:** 2026-08-29  
**Estado:** aceptada

Aunque la operación inicia con BODEGA PRINCIPAL, toda existencia referencia InventoryLocation. Los ajustes usan una transacción serializable y bloqueo de fila; actualizan stock, crean movimiento y auditoría como una unidad, con rechazo de saldos negativos.

## TD-007 — Precio FIXED/CONTACT e IVA configurable

**Fecha:** 2026-08-29  
**Estado:** aceptada

FIXED persiste un Decimal; CONTACT persiste NULL, nunca cero ficticio. La inclusión y tasa de impuesto se resuelven por producto y settings. Los cálculos utilizan Prisma.Decimal para evitar errores binarios de JavaScript.

## TD-008 — Atributos relacionales y variantes por opciones

**Fecha:** 2026-08-29  
**Estado:** aceptada

Las especificaciones no se agregan como columnas rígidas ni como JSON opaco. Categorías, atributos, opciones y valores se relacionan mediante tablas normalizadas. Las variantes referencian opciones y una clave de combinación única por producto evita duplicados.

## TD-009 — Integridad compuesta entre producto, variante, atributo y opción

**Fecha:** 2026-08-30  
**Estado:** aceptada

Las tablas que almacenan simultáneamente productId y variantId usan claves foráneas compuestas hacia ProductVariant(productId, id). De esta forma, inventario, movimientos y relaciones de proveedor no pueden persistir una variante de otro producto aunque una validación de servicio sea omitida.

El mismo principio se aplica a opciones: VariantAttributeValue(attributeId, optionId) y ProductAttributeValueOption(attributeId, optionId) referencian la opción junto con su atributo. ProductAttributeValueOption conserva también una FK compuesta al valor padre para impedir que su attributeId sea alterado de forma independiente.

La unicidad global de SKU entre Product y ProductVariant no puede representarse como un índice convencional entre dos tablas. Se resuelve con normalización en Zod y repositorio, más triggers PostgreSQL que toman un advisory lock transaccional por SKU y rechazan colisiones concurrentes. No se introdujo una tabla artificial de registro de SKU.

## TD-010 — Frontera pública de lectura y disponibilidad comercial

**Fecha:** 2026-08-30  
**Estado:** aceptada

El portal público comparte PostgreSQL como fuente de verdad, pero no reutiliza respuestas ni selects administrativos. Un Repository y Service específicos aplican visibilidad, selects mínimos y DTOs sin costos, reservas, proveedores, auditoría ni soft delete.

CONTACT se serializa con importe nulo y queda al final del orden de precio. La disponibilidad distingue stock propio, proveedor y agotado sin sumar stock externo al físico. El detalle selecciona la primera variante activa para ofrecer estado determinista de precio, SKU y disponibilidad.

No se incorpora caché en Fase 3: disponibilidad usa no-store y el resto permanece SSR bajo demanda hasta contar con métricas y una política de invalidación. La justificación completa está en `docs/adr/ADR-001-public-catalog-read-model.md`.

## TD-011 — Modalidades de precio de servicio FIXED/FROM/QUOTE

**Fecha:** 2026-08-30  
**Estado:** aceptada

Los servicios usan Decimal para `FIXED` y `FROM`; `QUOTE` exige precio nulo. La restricción existe en Zod, dominio y PostgreSQL. El portal no inventa `$0` ni un `Offer` para cotizaciones.

## TD-012 — Formularios dinámicos relacionales con snapshots históricos

**Fecha:** 2026-08-30  
**Estado:** aceptada

Campos y opciones son relaciones normalizadas. Cada respuesta de ticket copia clave, etiqueta, tipo y opciones seleccionadas. Editar o retirar el formulario futuro no altera la solicitud histórica.

## TD-013 — Ticket persistido antes del handoff a WhatsApp

**Fecha:** 2026-08-30  
**Estado:** aceptada

Cliente, TCK, ticket, respuestas, historial y auditoría se escriben transaccionalmente antes de devolver la URL de WhatsApp. El canal externo no controla la trazabilidad del negocio.

## TD-014 — Reutilización conservadora de identidad de cliente

**Fecha:** 2026-08-30  
**Estado:** aceptada

La coincidencia prioriza documento, email y WhatsApp normalizados, en ese orden. El nombre nunca fusiona registros y una coincidencia actualiza solo los datos aportados, evitando deduplicación agresiva.

## TD-015 — Adjuntos preparados sin almacenamiento improvisado

**Fecha:** 2026-08-30  
**Estado:** aceptada temporalmente

`TicketAttachment` conserva el contrato de metadatos y relaciones, pero la carga pública permanece deshabilitada hasta disponer de R2 o almacenamiento equivalente estable.

## TD-016 — Identidad de Customer bajo creación concurrente de tickets

**Fecha:** 2026-08-31  
**Estado:** aceptada

`documentNumber`, `email` y `whatsapp` ya almacenan valores canónicos y poseen unicidad PostgreSQL. Los valores nulos siguen admitiendo múltiples clientes legítimos. No se duplican columnas `normalized*`: la migración 4.1 agrega checks que obligan a conservar la forma canónica y el servicio consulta simultáneamente todos los identificadores.

La prioridad continúa siendo documento, email y WhatsApp. Si distintos valores apuntan a clientes diferentes se devuelve `CUSTOMER_IDENTITY_CONFLICT` y no se fusionan registros. Una carrera sobre la misma identidad se resuelve reintentando de forma acotada la transacción `Serializable` después de conflictos de serialización o unicidad de Customer.

## TD-017 — Autorización opaca para el handoff de WhatsApp

**Fecha:** 2026-08-31  
**Estado:** aceptada

El código `TCK-` es identificador comercial y no autoriza cambios. Cada ticket nuevo recibe un token aleatorio de 256 bits; el cliente lo recibe una sola vez y PostgreSQL conserva únicamente su hash SHA-256 único. La apertura exige la pareja TCK/token, usa comparación temporalmente segura, rechaza tickets cancelados y devuelve un error genérico sin confirmar existencia.

`whatsappOpenedAt` adopta semántica de primera apertura. Repetir el mismo handoff es idempotente, no cambia `TicketStatus` y solo la primera escritura produce `TICKET_WHATSAPP_OPENED`. El token, su hash y datos internos no se incorporan al mensaje comercial, auditoría ni DTO administrativo.

## TD-018 — Preview de checkout con fingerprint firmado

**Fecha:** 2026-08-31  
**Estado:** aceptada

El navegador envía únicamente producto, variante y cantidad. El servidor resuelve catálogo, precio, IVA, moneda y disponibilidad en bloque y firma la representación canónica con HMAC-SHA256. `POST /api/orders` vuelve a resolver todo y exige el mismo fingerprint; una diferencia devuelve `CHECKOUT_CHANGED`, sin crear Order ni reservas. El fingerprint no reemplaza la validación server-side.

## TD-019 — Una fuente completa de disponibilidad por línea

**Fecha:** 2026-08-31  
**Estado:** aceptada

Una línea usa `OWN_STOCK` si la ubicación predeterminada cubre toda la cantidad. Si no, un `SupplierProduct` activo debe cubrirla completa y la línea usa `SUPPLIER_STOCK`. No se mezclan unidades propias y externas, no se suman proveedores y nunca se modifica `supplierStock`. Solo `OWN_STOCK` crea reserva y movimientos físicos.

## TD-020 — Handoff de Order idempotente y recuperable

**Fecha:** 2026-08-31  
**Estado:** aceptada

El token de WhatsApp se deriva mediante HMAC-SHA256 de `requestId + orderId` con un secreto privado dedicado. PostgreSQL conserva únicamente SHA-256 del token. Un retry con el mismo `requestId` y fingerprint devuelve el mismo ORD, URL y token, sin duplicar Order ni reserva. ORD sigue siendo identificador visible, nunca credencial.

## TD-021 — Snapshots inmutables de OrderItem y entrega

**Fecha:** 2026-08-31  
**Estado:** aceptada

OrderItem copia códigos, SKU, nombres, variante, precio, IVA, cantidad, totales y fuente de disponibilidad. OrderAddress copia la dirección utilizada. La relación opcional con catálogo y Address facilita operación, pero la presentación histórica depende de snapshots y no cambia al editar o retirar datos futuros.

## TD-022 — Ownership de Address y preservación de variantes transaccionales

**Fecha:** 2026-09-03  
**Estado:** aceptada

Order usa una FK compuesta (customerId, addressId) hacia Address(customerId, id). PostgreSQL rechaza una dirección perteneciente a otro Customer; PICKUP conserva addressId nulo. La eliminación física de Address referenciada usa RESTRICT y OrderAddress continúa siendo el snapshot histórico.

OrderItem conserva productId con SET NULL para productos simples eliminados físicamente, pero su relación compuesta con ProductVariant usa RESTRICT. Una variante utilizada por un pedido se retira comercialmente mediante soft delete y no se elimina físicamente. Un Product con una variante histórica queda igualmente protegido por esa relación; los snapshots siguen siendo la autoridad de presentación.

## TD-023 — Cifrado versionado y deduplicación opaca de licencias

**Fecha:** 2026-09-03  
**Estado:** superseded por TD-026

DigitalLicense guarda la clave exclusivamente en un envelope v1 AES-256-GCM con nonce aleatorio de 96 bits y tag de autenticación. La clave maestra es un secreto privado base64 de exactamente 32 bytes. Un HMAC-SHA256 independiente, calculado después de aplicar solo trim, aporta unicidad sin hacer comparables las claves mediante hashes públicos. PostgreSQL conserva ciphertext, huella HMAC y últimos cuatro caracteres; ningún DTO general selecciona ciphertext o fingerprint.

El plaintext existe únicamente en memoria durante alta, importación o reveal individual. Reveal exige permiso dedicado, motivo, rate limit, Cache-Control no-store y auditoría sin plaintext. Rotar secretos y reenvolver registros queda como procedimiento operativo explícito antes de habilitar más versiones.

## TD-024 — Fulfillment separado del estado comercial de Order

**Fecha:** 2026-09-03  
**Estado:** parcialmente vigente; fulfillment superseded por TD-026

Order continúa como única fuente comercial de verdad. Cada OrderItem DIGITAL o LICENSE crea un DigitalFulfillment independiente: una licencia se reserva en la misma transacción Serializable que Order y pasa a ASSIGNED solo mediante entrega administrativa; un producto DIGITAL nace PENDING. Un pedido no puede marcarse DELIVERED mientras exista fulfillment digital pendiente.

La reserva de claves usa FOR UPDATE SKIP LOCKED y exige cubrir toda la cantidad. La cancelación devuelve únicamente licencias RESERVED a AVAILABLE; una clave ASSIGNED no se recicla. Los pedidos exclusivamente digitales usan DeliveryType.DIGITAL, sin Address, shipping ni cotización, mientras un pedido mixto conserva PICKUP o DELIVERY.

## TD-025 — LICENSE usa Buy Now individual sobre Order existente

**Fecha:** 2026-09-03  
**Estado:** vigente conceptualmente, actualizada por TD-026

Un producto LICENSE no entra al carrito, no se mezcla con otras líneas y siempre se compra con cantidad uno
mediante /licencias/[slug]/comprar. El flujo directo reutiliza POST /api/checkout/preview, POST /api/orders,
Customer, Order, OrderItem, idempotencia, rate limit, fingerprint, reserva transaccional y handoff de WhatsApp.

Una licencia representa una unidad secreta e individual del inventario digital. Mantener un solo pipeline
comercial evita divergencias de precio, identidad, auditoría y concurrencia. La intención efímera en
sessionStorage mejora la UX, pero no es fuente de verdad.

Desde Fase 6.2, la política aplica a DIGITAL: cantidad uno, compra individual y sin carrito. El servidor usa
DIGITAL_QUANTITY_INVALID y DIGITAL_BUY_NOW_REQUIRED. Cart conserva exclusivamente PHYSICAL.

## TD-026 — DIGITAL unifica licencias y elimina inventario interno de claves

**Fecha:** 2026-09-03  
**Estado:** aceptada

En la V1, DIGITAL representa productos comercializados en /licencias mediante Buy Now individual, cantidad
uno, Order y handoff de WhatsApp. El pago y la entrega de la licencia o código se coordinan fuera del sistema.
No existen inventario digital, claves persistidas, reserva, cifrado, reveal ni fulfillment específico.

ProductType queda reducido a PHYSICAL y DIGITAL. Cart admite únicamente PHYSICAL. Los productos DIGITAL FIXED
activos se consideran comercialmente disponibles sin consultar stock; CONTACT utiliza el contacto comercial.
Order, OrderItem, historial, idempotencia, auditoría y DeliveryType.DIGITAL siguen siendo la infraestructura
compartida. TD-023 queda superseded; de TD-024 solo permanece vigente Order como fuente comercial; TD-025
continúa conceptualmente con DIGITAL en lugar de LICENSE.

Refinamiento final de presentación pública: DIGITAL se publica dentro del catálogo general /productos. La
denominación comercial “Licencias” puede utilizarse como Category, banner o texto de marketing, pero no como
catálogo ni ruta canónica independiente. ProductType continúa determinando el comportamiento: PHYSICAL usa
Cart y DIGITAL usa Buy Now.

## TD-027 — Dashboard operational metrics are derived from transactional state

**Fecha:** 2026-09-04  
**Estado:** aceptada

El dashboard no persiste contadores ni crea una fuente analítica paralela. Deriva cantidades, importes, alertas y
filas recientes de Order, Ticket, Customer, Product, InventoryStock, SupplierProduct y Setting mediante consultas
agregadas acotadas. Los períodos respetan la zona operativa; `CANCELLED` queda fuera del valor de pedidos y las
ventas confirmadas usan una lista explícita de estados. Sin pagos/facturación, `DELIVERED` se comunica como valor
de pedidos entregados y no como ingreso real.

Stock bajo significa exclusivamente `quantityOnHand - quantityReserved` de PHYSICAL administrado. SupplierStock
se presenta como insight separado y DIGITAL no participa. Las reservas antiguas generan visibilidad, pero no se
liberan automáticamente sin una política de TTL y un job futuro.

## TD-028 — Promotions are informational in V1 and do not alter checkout pricing

**Fecha:** 2026-09-04  
**Estado:** aceptada

Promotion V1 es contenido visual programable asociado por tablas puente a Product y Category. El read model elige
una promoción vigente por prioridad y expone solo nombre, descripción y badge. No modifica Product.price,
preview firmado, OrderItem ni Order.total, por lo que el checkout cerrado en Fase 5 conserva una única autoridad
de precio.

Porcentajes, montos fijos, cupones y reglas quedan fuera de Promotion. Si se requieren, deberán diseñarse como un
PromotionEngine transaccional con redondeo, impuestos, snapshots, idempotencia y auditoría explícitos.

## TD-029 — AJKSolutionS Light Design System and UI consistency

**Fecha:** 2026-09-08
**Estado:** aceptada

La identidad oficial usa sin transformación el logo entregado por AJKSolutionS. La V1 adopta un sistema visual
exclusivamente claro sobre Nuxt UI, con azul AJK como primario y zinc como neutral; no existe dark mode ni una
variante alternativa del logo. El storefront se diseña mobile-first. El administrador se diseña desktop-first,
pero navegación, formularios y tablas deben seguir siendo utilizables en móvil.

Nuxt UI es la base de componentes, foco, overlays, estados y tokens. CSS propio se limita a composición y patrones
compartidos, evitando paletas paralelas y controles interactivos improvisados.
El shell administrativo usa la familia oficial UDashboard y UNavigationMenu; el mismo sidebar resuelve escritorio
y móvil, conserva RBAC y persiste de forma nativa su tamaño y estado colapsado. El control de colapso de escritorio
se aloja en el navbar, como en el template Dashboard oficial, mientras el toggle móvil abre el overlay del sidebar.
Ese navbar es también la única fuente del encabezado principal de la sección activa; las páginas raíz no repiten el
título y las vistas de creación, edición o detalle conservan únicamente su encabezado contextual de segundo nivel.

## TD-030 — Selective public caching with explicit invalidation

**Fecha:** 2026-09-08
**Estado:** aceptada

Solo los read models públicos estables seleccionados pueden almacenarse en caché Nitro: home, banners, categorías,
marcas, settings públicos, servicios, productos y relacionados. Cada recurso declara TTL, la query canónica forma
parte de la clave y el contenido programado limita su propia vigencia. Availability, autenticación, administración,
checkout y operaciones transaccionales de Order/Ticket usan `no-store` y nunca comparten caché.

Las mutaciones invalidan explícitamente todos los recursos dependientes después de asentarse. Una versión por recurso
evita repoblación obsoleta por requests en vuelo y los fallos de invalidación se tratan de forma cerrada. La V1 usa
almacenamiento local Nitro, sin Redis; una topología multiproceso deberá adoptar un backend distribuido compatible.
La reactividad del admin se resuelve por reconciliación y `refreshNuxtData`, separada de esta caché de servidor.

## TD-031 — Administrative session lifetime and inactivity policy

**Fecha:** 2026-09-10
**Estado:** aceptada

La sesión administrativa tiene un máximo absoluto no deslizante de 8 horas desde `loggedInAt` y un máximo de 30
minutos desde `lastActivityAt`. El cliente avisa durante los últimos 2 minutos de inactividad y revalida cada ~5
minutos o al volver a una pestaña desactualizada. Los eventos locales solo gobiernan UX; el servidor valida fechas,
usuario activo y RBAC antes de entregar cualquier dato de `/api/admin/**`.

Los refresh de actividad, usuario o permisos limitan el `maxAge` del cookie al tiempo absoluto restante. Auth y
administración permanecen en `no-store`; no participan del caché público. La política usa el cookie cifrado de
`nuxt-auth-utils`, no requiere tablas ni migraciones y mantiene `httpOnly`, `secure` en producción y `sameSite=lax`.
