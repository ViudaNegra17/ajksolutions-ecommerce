# Implementación de la Fase 7

## 1. Alcance

La fase convierte el backoffice existente en una herramienta operativa sin crear una fuente comercial paralela.
Dashboard, clientes, alertas y contenido derivan de Product, Customer, Order, Ticket, InventoryStock,
SupplierProduct, Setting y AuditLog. Solo se añadieron Banner y Promotion con sus asociaciones de catálogo.
No se implementaron pagos, facturación, cupones, pricing dinámico, CRM, jobs, Redis ni componentes de Fase 8.

## 2. Dashboard

`/admin` consume un DTO agregado desde `GET /api/admin/dashboard`. El período predeterminado es 30 días y se
puede cambiar a hoy, 7 días o mes actual. Los límites diarios se calculan con `business.timeZone`, cuyo fallback
seguro es `America/Guayaquil`. La pantalla ofrece estados de carga/error, tarjetas adaptables, acciones rápidas
según permisos, últimos pedidos, tickets recientes, alertas y stock bajo.

El servicio usa aproximadamente 17 consultas acotadas: settings, agregados, listas recientes, alertas y una
resolución en bloque de productos con stock. No consulta datos por cada fila y no devuelve modelos Prisma
completos.

## 3. KPI definitions

- Pedidos nuevos: `NEW` creados en el período.
- Pedidos pendientes: `NEW + CONTACTED` creados en el período.
- Pedidos confirmados: `CONFIRMED`, `PAYMENT_PENDING`, `PAID`, `PREPARING`, `READY`, `SHIPPED` y `DELIVERED`.
- Pedidos entregados: únicamente `DELIVERED`.
- Tickets nuevos: `NEW`; tickets abiertos: todos excepto `DELIVERED` y `CANCELLED`.
- Clientes registrados: Customer no eliminado creado en el período.
- Productos activos: inventario comercial activo actual, no un conteo histórico.
- Valor de pedidos: suma de todos los estados salvo `CANCELLED`.
- Ventas confirmadas: suma de los estados confirmados definidos arriba.
- Valor de pedidos entregados: suma exclusiva de `DELIVERED`; no se presenta como ingreso cobrado.

Los importes permanecen como `Decimal` en Prisma y se serializan como strings con dos decimales. La moneda se
obtiene del setting vigente, no se fija en la vista.

## 4. Orders

El widget muestra ORD, cliente, total, tipo de entrega, estado y fecha, con enlace directo a
`/admin/pedidos/[id]`. Se reutilizan Order y sus estados existentes. Las reservas antiguas se detectan como Orders
`NEW` anteriores a `orders.newAlertHours` que contienen al menos una línea `OWN_STOCK`; no se liberan de forma
automática.

## 5. Tickets

El widget muestra TCK, cliente, servicio, prioridad, estado y fecha, con enlace a `/admin/tickets/[id]`. La alerta
operativa cuenta tickets `NEW` anteriores a `tickets.newAlertHours`. No se añadió un estado ni dominio paralelo.

## 6. Customers

Se implementaron `/admin/clientes` y `/admin/clientes/[id]`. La lista pagina y busca server-side por código,
nombre, documento, email o WhatsApp; muestra conteos de pedidos/tickets, actividad y estado. El detalle contiene
datos, direcciones vigentes, Orders y Tickets. El valor histórico excluye `CANCELLED` y se etiqueta como valor de
pedidos, no como dinero cobrado. No se incorporó borrado destructivo ni CRM.

## 7. Inventory alerts

Stock bajo aplica solo a productos `PHYSICAL`, activos y con `manageStock`. Se agrupa InventoryStock y se calcula
`quantityOnHand - quantityReserved`; aparece cuando el disponible es menor o igual a
`inventory.lowStockThreshold`. `supplierStock` no se mezcla con stock propio y se informa por separado como
productos sin stock propio pero con proveedor. `DIGITAL` queda excluido aunque existiera una fila inconsistente.

También se muestran alertas acotadas de productos activos sin imagen y productos destacados con precio
`CONTACT`.

## 8. Banners

Banner incluye código `BAN-000001`, textos planos, URLs de imagen desktop/mobile, CTA, placement, orden,
activación, ventana temporal y soft delete. Los placements son `HOME_HERO`, `HOME_SECONDARY` y `PRODUCTS_TOP`.
El read model público exige activo, no eliminado, inicio alcanzado y fin no vencido, y ordena establemente por
`sortOrder` y creación. `/admin/banners` permite crear, editar, activar/desactivar, ordenar, previsualizar y
retirar.

Las imágenes aceptan solo HTTPS. CTA acepta ruta interna o HTTPS y debe configurarse junto con su etiqueta. No
se admite HTML ni se utiliza `v-html`.

## 9. Promotions

Promotion se limita a `INFORMATIONAL`, usa códigos `PRO-000001`, badge, prioridad, scheduling, activación y soft
delete. PromotionProduct y PromotionCategory modelan targets muchos-a-muchos reales. El catálogo combina targets
directos y por categoría, filtra vigencia y muestra solo la promoción activa de mayor prioridad.

La promoción no modifica Product.price, preview, OrderItem ni Order.total. Cupones, reglas y descuentos
transaccionales requieren un motor futuro independiente.

## 10. Settings

`/admin/configuracion` agrupa Negocio, Comercio, Inventario/Operación, SEO y Redes. El backend acepta únicamente
el objeto validado por `adminSettingsSchema`; no permite keys arbitrarias ni expone secretos. Reutiliza las keys
legacy vigentes `currency`, `country`, `tax.defaultRate` y `tax.pricesIncludeTax`, mapeándolas a los grupos de UI,
y añade información de negocio, ubicación, umbrales, SEO y redes.

WhatsApp se normaliza con la regla canónica existente; timezone se verifica con Intl, la ubicación debe existir y
los límites numéricos/URLs se validan con Zod. La actualización es transaccional.

## 11. Home read model

`GET /api/home` entrega categorías, marcas, productos destacados/recientes, servicios destacados, settings y
banners públicos mediante DTOs mínimos. La home SSR usa hero y banners secundarios dinámicos con fallback limpio.
`GET /api/banners?placement=PRODUCTS_TOP` alimenta la superficie superior de `/productos`. ProductCard muestra el
badge informativo sin alterar precio ni disponibilidad. Footer consume información y redes públicas no vacías.

Se retiró cache público temporal de settings para evitar lecturas obsoletas sin una estrategia de invalidación.

## 12. RBAC

Se añadieron `banners.view/create/update/delete`, `promotions.view/create/update/delete` y
`settings.view/update`. SUPER_ADMIN conserva todos; ADMIN administra contenido/settings; SALES y SUPPORT tienen
lectura de banners/promociones pero no escritura. Acciones y navegación se ocultan según permisos y cada endpoint
vuelve a exigir el permiso correspondiente. El E2E confirma 403 para un SUPPORT que intenta las tres escrituras.

## 13. Audit

Los writes registran `BANNER_CREATED/UPDATED/DELETED`, `PROMOTION_CREATED/UPDATED/DELETED` y `SETTING_UPDATED`.
Banner registra código, placement y estado; Promotion registra código, estado y cantidad de targets; Setting
registra solo el DTO operativo permitido. No se auditan lecturas ni se guardan secretos.

## 14. Prisma

Se agregaron `BannerPlacement`, `PromotionType`, Banner, Promotion, PromotionProduct y PromotionCategory. Los
códigos son únicos; fechas, estado, prioridad/orden y soft delete tienen índices dirigidos. Product y Category
incorporan relaciones de promoción. El cascade elimina únicamente filas puente si se elimina físicamente un
target; nunca destruye la Promotion. Los índices transaccionales existentes de Order/Ticket ya cubrían estado y
fecha, por lo que no se duplicaron.

## 15. Migration

`20260904120000_phase7_operations_content` es incremental y no se modificó. Crea enums, tablas, índices y FKs de
contenido sin eliminar datos comerciales. El hardening posterior añadió una segunda migración incremental;
PostgreSQL local reporta 12 migraciones y schema actualizado.

## 16. APIs

- `GET /api/admin/dashboard`.
- `GET/POST /api/admin/banners` y `PUT/DELETE /api/admin/banners/[id]`.
- `GET/POST /api/admin/promotions`, `GET /api/admin/promotions/options` y
  `PUT/DELETE /api/admin/promotions/[id]`.
- `GET/PUT /api/admin/settings`.
- `GET /api/admin/customers` y `GET /api/admin/customers/[id]`.
- `GET /api/home`, `GET /api/banners` y los read models de productos ampliados.

Todos los endpoints administrativos son autenticados y autorizados. Queries y bodies usan schemas Zod; los DTOs
públicos excluyen IDs internos de asociaciones, flags administrativos y settings privados.

## 17. UI admin

Se construyeron dashboard responsive, clientes lista/detalle, CRUD de banners, CRUD de promociones informativas y
configuración agrupada. Se reutilizaron las pantallas existentes de pedidos, tickets, productos, servicios e
inventario. Hay skeletons, estados vacíos, errores legibles, confirmación de retiro y navegación directa entre
widgets y detalle.

## 18. UI public

La home renderiza banners vigentes, productos, servicios y categorías reales desde SSR. `/productos` admite
banners `PRODUCTS_TOP` y badges por Product/Category. Sin banner o promoción, ambas pantallas mantienen su layout
y comportamiento anterior. Los textos son interpolación Vue segura y las URLs pasan whitelist de esquema.

## 19. Tests

Unit cubre zona horaria, políticas económicas incluido `CANCELLED`, stock disponible, exclusión DIGITAL,
scheduling, fechas y URLs inseguras. Integración cubre orden estable y estados de banners, promoción por categoría
sin cambio de precio, dashboard/threshold/decimales y whitelist pública. E2E cubre dashboard→Order, banners
vigente/expirado, Promotion, Setting restaurado, Customer, RBAC y smoke de diez rutas.

Resultado: 100/100 pruebas Vitest y 31/31 pruebas Playwright. Los seis escenarios específicos de Fase 7,
incluido el smoke de rutas, aprobaron también de forma enfocada.

## 20. Gates

Aprobaron Prisma format/validate/generate/deploy/seed/migrate status, ESLint, Prettier, typecheck, 100/100 pruebas
Vitest, 31/31 pruebas Playwright, el build Nuxt/Nitro de producción y la verificación de código prohibido. El build
conserva avisos no bloqueantes de dependencias sobre resolución de exports y tiempos de plugins; terminó con exit
code 0.

## 21. Base vacía

`pnpm test:database:phase7` crea un nombre validado `ajksolutions_phase7_empty_*`, aplica las 12 migraciones,
ejecuta seed, corre la integración de Fase 7, verifica tablas/permisos/settings y elimina la base en `finally`.
El proceso aprobó sin Docker y sin reconstruir la base principal.

## 22. Regressions

La suite completa mantuvo verdes Product→Cart→Checkout→Order para PHYSICAL, Buy Now→Order→WhatsApp para DIGITAL,
Service→Ticket→WhatsApp, administración de inventario, SEO/canonical y redirects legacy. La búsqueda en código
activo de `ProductType.LICENSE`, `DigitalLicense`, `DigitalFulfillment`, `/api/licenses`, `/admin/licencias` y
canonical de `/licencias` no produjo coincidencias.

## 23. Debt

- Integración de almacenamiento R2/upload para imágenes; hoy se administran URLs HTTPS.
- Expiración automática de reservas mediante job; hoy el dashboard solo detecta el riesgo.
- PromotionEngine, cupones y descuentos de checkout si el negocio los define en una fase futura.
- Rango personalizado/charts únicamente si la operación demuestra que aportan valor.
- CRM, segmentación y campañas permanecen fuera del alcance.

## 24. Status

FASE 7 CERRADA DEFINITIVAMENTE. La plataforma dispone de visibilidad operativa, contenido administrable,
configuración segura e invariantes PostgreSQL para scheduling/CTA sin alterar silenciosamente el núcleo
transaccional. No se inició la Fase 8.

# Corrección posterior de integridad Banner/Promotion

## Riesgo detectado

Zod y el servicio impedían rangos invertidos y CTA incompletas, pero una escritura SQL directa aún podía omitir
esas reglas. Esto permitía estados de contenido imposibles fuera de la aplicación. El modelo Prisma no cambió,
porque estos CHECK son invariantes adicionales propias de PostgreSQL.

## Invariantes añadidas

- `banners_valid_schedule`: admite uno o ambos extremos NULL y exige `endsAt > startsAt` cuando ambos existen.
- `promotions_valid_schedule`: aplica la misma regla estricta a Promotion.
- `banners_complete_cta`: exige ambos campos CTA ausentes o ambos presentes y no vacíos después de trim.

La validación compleja de URL continúa en Zod/servicio. No se añadieron checks de timezone, teléfonos, prioridad o
sortOrder.

## Prechecks y atomicidad

La migración ejecuta, en el orden requerido, prechecks de fechas Banner, fechas Promotion y pareja CTA. Si
encuentra datos incompatibles aborta respectivamente con:

- `PHASE7_BANNER_INVALID_SCHEDULE_REQUIRES_MANUAL_REVIEW`.
- `PHASE7_PROMOTION_INVALID_SCHEDULE_REQUIRES_MANUAL_REVIEW`.
- `PHASE7_BANNER_INCOMPLETE_CTA_REQUIRES_MANUAL_REVIEW`.

No corrige, intercambia ni elimina valores. Todo el archivo está envuelto en una transacción explícita; la prueba
de cada aborto confirma que quedan cero constraints aplicados parcialmente. El precheck de la base local reportó
cero filas incompatibles antes del deploy.

## Migración

La migración exacta es
`20260904150000_phase7_banner_promotion_integrity_hardening`. Es la migración número 12 y no modifica
`20260904120000_phase7_operations_content`. El catálogo PostgreSQL local confirmó por nombre los tres CHECK.

## Tests directos de DB

`pnpm test:integrity:phase7` usa bases temporales aisladas. Comprueba Banner sin fechas, con solo inicio, solo fin,
rango válido, sin CTA y con CTA completa; rechaza fechas iguales/invertidas y cada mitad de CTA. Promotion acepta
el rango válido y rechaza igualdad/inversión. También parte de filas válidas y demuestra que UPDATE no puede
invalidar fechas ni CTA. Las tres bases de precheck abortan con el mensaje exacto y sin aplicación parcial.

## Base vacía

`pnpm test:database:phase7` reconstruyó PostgreSQL desde cero con las 12 migraciones, ejecutó seed, corrió la
integración y verificó las tres constraints. La base temporal se eliminó en `finally`; no se utilizó Docker ni se
reconstruyó la base principal.

## Gates del hardening

Además de los verificadores `test:precheck:phase7`, `test:integrity:phase7` y `test:database:phase7`, se repitieron
los gates Prisma, lint, format, typecheck, Vitest, Playwright y build. Dashboard, Settings, Customers, home,
`PRODUCTS_TOP`, promociones informativas y los flujos PHYSICAL/DIGITAL/SERVICE permanecen sin cambios funcionales.
