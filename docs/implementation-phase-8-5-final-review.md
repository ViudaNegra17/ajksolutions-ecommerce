# Fase 8.5 — Revisión final y Release Candidate V1

Fecha de revisión: 2026-10-03. Repositorio: `ViudaNegra17/ajksolutions-ecommerce`, rama `main`.

## 1. Baseline y alcance

HEAD inicial local y remoto: `3b2a795d1fd06ce00bb1dc6f2a5e5cd4c8a4ecfd`,
`test: isolate visual regression database`. Worktree inicialmente limpio; ningún commit posterior
ni conflicto con trabajo del usuario. CI inicial: [run 34654662376](https://github.com/ViudaNegra17/ajksolutions-ecommerce/actions/runs/34654662376), SUCCESS para ese SHA.

Antes de implementar se revisaron schema, migraciones, formularios, servicios, repositorios,
Home, detalles, cache, pruebas y workflow. El baseline pasó Prisma, lint, format, typecheck,
135 pruebas Vitest, 50 E2E, 19 visuales y build. Se mantuvo PostgreSQL instalado, sin Docker.

Esta fase simplifica, corrige y prepara el candidato; no inicia fase 9 ni despliega producción.
Se conserva Nuxt/Vue/Nuxt UI, TypeScript strict, modular monolith, Prisma y Zod.

## 2. Identificadores y datos

| Campo                       | Autoridad                     | Comportamiento                                              |
| --------------------------- | ----------------------------- | ----------------------------------------------------------- |
| Product.productCode         | CodeSequence transaccional    | Automático, único e inmutable                               |
| Product.sku                 | Backend, `SKU-${productCode}` | Automático, oculto; los existentes no se regeneran          |
| ProductVariant.sku          | Backend, `SKU-${variantCode}` | Automático, oculto; los existentes se conservan             |
| SupplierProduct.supplierSku | Administrador                 | Manual, opcional, visible y editable                        |
| Product.barcode             | Administrador                 | String nullable, trim, máximo 100, UNIQUE cuando no es NULL |
| Slugs públicos              | Backend                       | Nombre normalizado al crear; estables al editar             |

La creación de productos y variantes reutiliza CodeSequence dentro de la transacción existente;
no usa count()+1. El backend ignora los SKU enviados por clientes para persistencia.
Las restricciones de unicidad previas permanecen intactas. No hay backfill de SKU o URLs.

`createWithUniqueSlug` intenta el slug normalizado, luego `-2`, `-3`, etc., con un máximo de
50 intentos. La restricción PostgreSQL es la autoridad; solo reintenta P2002 de slug.
Reintenta la operación completa, incluida la transacción, no una transacción abortada.
Otros conflictos únicos se propagan y el agotamiento devuelve un conflicto explícito.
Se aplica a Product, Category, Brand, Attribute, Service y ServiceCategory. Cambiar nombre
o enviar otro slug no cambia la URL existente. No se añade una tabla ni una consulta previa vulnerable a carreras.

### Migración única

`20261002090000_phase8_5_product_barcode` añade `products.barcode VARCHAR(100)` nullable y
`products_barcode_key` UNIQUE. El precheck encontró cuatro productos, cero variantes y ninguna
columna barcode: no existían valores legacy que pudieran colisionar. Los productos anteriores
quedan con NULL, sin convertir productCode/SKU en barcode. Ninguna migración histórica fue editada.
Warranty y weight conservan sus columnas anteriores; no justifican otra migración.

Barcode participa en búsqueda administrativa, catálogo público y sugerencias; no se añade a
ProductCard como ruido visual. Un lector USB puede escribir en el input normal, sin integración hardware.

## 3. Administración comercial

ProductAdminForm General presenta nombre, código/código de barras con ayuda, tipo amigable,
descripciones, garantía, peso físico y estados existentes. El código interno aparece solo como
información de lectura al editar. Se eliminan los inputs SKU y slug, incluido el duplicado SEO
y los SKU de variantes. Los formularios de servicios, categorías, marcas, atributos y categorías
de servicio tampoco solicitan slug; sus datos operativos se conservan.

Garantía usa Sin garantía, 30 días, 90 días, 6 meses, 12 meses o Personalizada. Sin garantía
persiste NULL; opciones estándar persisten texto normalizado; Personalizada exige texto.
Valores anteriores no estándar se hidratan como Personalizada sin pérdida. Cambiar a estándar
limpia el texto personalizado; el servidor decide el valor final.

Peso sigue Decimal(12,3), en kg, no negativo y hasta tres decimales. Solo se muestra para
PHYSICAL. DIGITAL persiste NULL incluso si se envía peso manipulado; permanece sin stock.
Las etiquetas son Producto físico y Producto digital; los enums internos no cambian.

Imágenes continúan por URL, alt, orden y principal. No hay uploads, R2, CDN nueva, conversión
ni file picker. Se retira el texto técnico sobre storageKey/R2.

Durante la auditoría se encontró un bug real en el selector de tipo de atributo: mostraba una
etiqueta traducida sin value explícito y podía enviar Texto en lugar de TEXT. Se conserva la
etiqueta amigable y se añade el value del enum; no cambia el dominio.

## 4. Home y detalles públicos

Home queda: hero comercial, tres soluciones, campaña HOME_SECONDARY opcional, selección de
hasta tres servicios, licencias digitales, respaldo, tres pasos para comprar/solicitar y CTA final.
HOME_HERO reutiliza title/subtitle/description/imageUrl/mobileImageUrl/CTA existentes:
copy e imagen protagonista en desktop, copy/CTA antes de imagen en móvil, sin baja opacidad.
Sin banner hay un fallback de marca, no un precio, fotografía ni promoción inventados.

Las soluciones enlazan `/productos`, `/productos?productType=DIGITAL` y `/servicios`.
El CTA de asesoría usa WhatsApp de Setting o un destino de servicios si falta configuración.
No se crean rutas /licencias: permanecen redirects históricos 301.

Se retiran categorías, productos destacados, novedades, marcas decorativas y servicios
duplicados, tanto de la vista como del read model. `/api/home` devuelve únicamente settings,
services y banners HOME_HERO/HOME_SECONDARY. Cache, versiones e invalidaciones existentes
por catálogo, servicios, settings y banners permanecen vigentes. No se cachean sesiones,
admin, checkout, orders ni tickets. Canonical y SEO configurado se conservan.

Product y Service detail comparten PublicDescription: texto escapado, saltos de línea,
ancho de lectura limitado y sin prose-invert/max-w-none. Mejoran retícula móvil y jerarquía;
Producto mantiene precio, disponibilidad, variantes, garantía, related y CTAs, y muestra peso
físico. Servicio conserva precio, modalidades y formulario. No se modifica lógica de compra.

Otros ajustes mínimos: búsqueda orientada a nombre/código, tabla administrativa sin SKU
redundante, mensaje digital de checkout acorde a coordinación manual por WhatsApp y estado
vacío de confirmación sin instrucciones técnicas sobre ORD.

## 5. Auditorías y reglas preservadas

PHYSICAL sigue Product → Cart → Checkout → Order persistida → WhatsApp.
DIGITAL sigue Comprar ahora → Checkout individual, cantidad 1, sin Address/reserva/stock,
shipping 0 → Order persistida → WhatsApp. SERVICE sigue formulario → Customer/Ticket
persistidos → WhatsApp. WhatsApp no es source of truth. Promotions permanece INFORMATIONAL;
no cambia precio, discount, checkout ni total. No se añade fulfillment digital ni ProductType LICENSE.

RBAC, validación server-side, sesiones endurecidas, audit logs y no-store privado no se
alteran. Los tests de dominio prueban tampering, unicidad y concurrencia real PostgreSQL;
la suite funcional conserva verificaciones de auditoría, permisos y flujos transaccionales.
Las descripciones no ejecutan HTML. No se añaden analytics, píxeles ni cookie banner por cache.
No se incluyen credenciales, dumps ni configuración privada en esta documentación.

Revisión de contenido: no se prometen email, descarga automática, entrega inmediata ni
activación propia. Garantía y disponibilidad se presentan según datos, sin inventar plazos.
La revisión responsive cubre 320, 375, 390, 430, 768, 1024, 1280 y 1440 en Home y detalles.
Las referencias visuales siguen cubriendo catálogo, servicios, carrito, checkout y administración.

## 6. Archivos principales

- Schema y migración: `prisma/schema.prisma`, nueva carpeta de migración barcode.
- Dominio: `shared/schemas/product.schema.ts`, `shared/utils/product-warranty.ts`,
  `server/utils/unique-slug.ts`, servicios de catálogo/servicios y repositorios correspondientes.
- Público: `server/api/home.get.ts`, servicios públicos, read model de catálogo,
  `shared/types/public-catalog.ts`, `app/pages/index.vue`, detalles y PublicDescription.
- Admin: ProductAdminForm, ServiceAdminForm, categorías/marcas/atributos/categorías de servicio
  y listado de productos.
- QA: suites final-review-phase8-5 unit/integration/E2E, fixtures y adaptaciones de pruebas
  existentes; `playwright.config.ts`, runner visual, verificador DB vacía, package.json y CI.

Playwright acepta PLAYWRIGHT_BASE_URL y no reutiliza un servidor cuando se solicita aislamiento.
Las pruebas locales usan 3012; el runner visual siempre usa 3013 con una DB temporal propia.
Se evita reutilizar el servidor del usuario conectado a otra base, sin detenerlo.
El verificador de DB vacía valida un nombre generado, despliega todas las migraciones,
ejecuta seed e integration, comprueba nullable/longitud/UNIQUE y elimina solo esa DB temporal.
Ese control también es un gate CI.

## 7. QA y referencias visuales

La pasada final secuencial terminó con exit code 0 en todos los gates:

| Gate                                                   | Resultado                            |
| ------------------------------------------------------ | ------------------------------------ |
| pnpm install --frozen-lockfile                         | PASS, sin cambios de lockfile        |
| Prisma format --check / validate / generate            | PASS                                 |
| migrate deploy / status / seed                         | PASS, 14 migraciones, sin pendientes |
| ESLint / Prettier check / typecheck                    | PASS                                 |
| Vitest                                                 | 20 archivos, 143/143 PASS            |
| Base vacía: migraciones + seed + integration           | 9 archivos, 52/52 PASS               |
| Barcode nullable, longitud e índice UNIQUE en DB vacía | PASS                                 |
| Playwright funcional                                   | 54/54 PASS                           |
| Playwright visual, sin actualizar                      | 19/19 PASS                           |
| Nuxt producción: cliente, servidor y Nitro             | PASS, Build complete                 |

Son 216 pruebas primarias, más la repetición de las 52 integraciones en DB vacía. No se declara
cierre remoto hasta verificar Actions; no se actualizan snapshots masivamente.

La primera comparación visual completa produjo 12 PASS y siete diferencias previstas. Se
inspeccionaron los PNG recibidos y las referencias originales. Se corrigió la sección vacía del
detalle cuando faltan descripción y especificaciones, y se completó el fixture físico con
descripción, garantía y peso para que SSR también ejercite esas vistas. La actualización selectiva
`pnpm test:visual:update '--screens=home,detail,service-detail,admin-products'` pasó 7/7.
Las comparaciones no dependen unas de otras: workers=1 se mantiene, pero un fallo ya no omite
las pantallas restantes; ninguna tolerancia fue aumentada.

Referencias intencionalmente actualizadas, Chromium/Windows:

- `home-390-chromium-win32.png` y `home-1440-chromium-win32.png`: arquitectura comercial nueva.
- `detail-390-chromium-win32.png` y `detail-1440-chromium-win32.png`: jerarquía, SKU oculto,
  descripción legible, garantía y peso físico.
- `service-detail-390-chromium-win32.png` y `service-detail-1440-chromium-win32.png`:
  descripción compartida y retícula legible.
- `admin-products-chromium-win32.png`: código interno sin línea SKU y label de búsqueda comercial.

Catálogo, digital, servicios, carrito, checkout, dashboard y settings conservan las otras doce
referencias. No hubo actualización global. El cambio breve del placeholder público sigue dentro
de la tolerancia previa sin requerir renovar su referencia.

Los fallos iniciales E2E se corrigieron en la preparación de pruebas: categoría sin slug vacío,
espera de hidratación antes de buscar, navegación cliente para URLs de fixtures no existentes
en SSR y selectores del CTA/formulario específicos. No se borraron pruebas ni se redujeron
aserciones. La suite funcional completa pasó 54/54 antes de la última pasada secuencial.

## 8. Checklist del operador: configuración y legal

- Completar o aprobar teléfono, email, dirección, ciudad y redes: vacíos al consultar la DB local.
- Verificar que nombre, WhatsApp, moneda/país y SEO ya configurados sean datos comerciales
  definitivos; presencia en Setting no demuestra que el número sea un canal operativo real.
- Revisar productos/servicios/imágenes/descripciones demo antes de publicar y desactivar los
  que no correspondan; no se borraron datos del negocio para esta auditoría.
- Aportar textos aprobados de términos, privacidad, garantías, cambios/devoluciones, entrega
  e identificación comercial. No se encontraron páginas legales aprobadas. No se inventaron
  políticas definitivas ni se publicaron borradores como válidos.
- Definir dominio HTTPS, hosting, TLS, secretos independientes, alertas y backups externos;
  ejecutar smoke del candidato desplegado y un restore drill en la infraestructura elegida.
- Mantener instancia única mientras cache/rate limit residan en memoria; no se añade Redis.

Estos son bloqueadores de producción, no features de fase 9. Una ejecución local/CI correcta
no acredita despliegue ni aprobación legal. No se declara PRODUCTION READY.

## 9. Limitaciones conocidas y cierre

Los avisos previos de pg sobre consultas concurrentes y del tiempo de setup de Nuxt DevTools
no justifican upgrades preventivos ni desactivar controles. Este alcance no modifica pg/Prisma.
El build mantiene avisos de timing de plugins y resolución de exports de dependencias, sin fallo;
los scripts Windows conservan el aviso DEP0190 de spawn con shell y argumentos internos controlados.
Para desplegar en otra arquitectura deben reinstalarse las dependencias nativas correspondientes.
Las versiones y lockfile siguen fijados. La validación visual se realiza con PNGs de Playwright:
el navegador integrado no pudo iniciar por CryptUnprotectData en este entorno.

CI final debe corresponder al SHA exacto enviado a main. Consulte el SHA de la entrega con
`git rev-parse HEAD` y el run enlazado en el reporte final; no confundir el CI baseline con el final.
Estado: **FASE 8.5 — IMPLEMENTACIÓN TÉCNICA COMPLETADA**, código y QA verificados en CI #13
tras el incidente documentado en la sección 11. El último HEAD de entrega debe cumplir igualmente
el protocolo de CI exacto descrito abajo; no se declara cierre anticipado de una ejecución pendiente.
**PREPRODUCCIÓN — PENDIENTE** del checklist externo; no se declara PRODUCTION READY.

## 10. Evidencia GitHub Actions y entrega

Commit de implementación: `a62e4cd7559e34e1d75751e5ab9e864b159d1389`,
`feat: complete phase 8.5 commercial and release candidate review`.
Push a main confirmado; worktree limpio al terminar la ejecución remota.

[CI #11, run 37142830434](https://github.com/ViudaNegra17/ajksolutions-ecommerce/actions/runs/37142830434):
completed / SUCCESS para ese SHA exacto. Se verificaron individualmente los 16 gates pnpm:
instalación congelada, Prisma format/validate/generate/deploy/status/seed, lint, formato, typecheck,
Vitest, DB vacía, instalación Chromium, E2E, visual y build. PostgreSQL del runner fue preparado
correctamente; solo se omitió el upload de reporte condicionado a fallo, como corresponde a un run exitoso.
El primer push pasó sin correcciones posteriores de código de aplicación.

Esta revisión posterior modifica únicamente la documentación para incorporar evidencia real,
no código, schema, migraciones ni referencias. El commit documental también se envía a main y
debe pasar su workflow completo. El reporte de entrega identifica su HEAD final y run exactos;
no se graba aquí el SHA autorreferencial de este mismo archivo. La confirmación final se emite
solo después del CI GREEN correspondiente al último HEAD. No se despliega producción ni se inicia fase 9.

## 11. Incidente de CI posterior y ajuste de QA

El commit documental `7298aabaf5642f088020c49cde56355af0274587` no alteraba código de aplicación,
pero [CI #12](https://github.com/ViudaNegra17/ajksolutions-ecommerce/actions/runs/37143796454)
falló en E2E: 51 PASS, dos esperas de hidratación fallidas y una prueba posterior omitida por
la suite serial existente. No se oculta ese resultado ni se confunde con el SUCCESS anterior.

La prueba nueva del hero esperaba solamente 5 s para mounted; se alinea a 45 s, como otros
controles existentes de hidratación. Conserva la misma aserción `data-hydrated=true`, imagen,
CTA y responsive. La otra espera administrativa de 30 s conserva su límite y aserción; ahora
identifica la ruta en el mensaje. Los logs disponibles no permiten atribuirle una causa de
aplicación concreta ni afirmar que fue reparada mediante un cambio de dominio.

Se corrige además un hueco de diagnóstico real: `on-first-retry` no producía trazas porque
no hay retries configurados, y no existía reporter HTML para el artifact ya definido en CI.
Ahora se retienen trazas solo al fallar y se genera HTML sin abrir navegador. No se añaden
retries, skips, tolerancias visuales nuevas ni excepciones a las aserciones. Los reportes locales
siguen ignorados por Git; las trazas de CI usan exclusivamente cuentas/secrets de prueba.
Se exigió repetir las suites afectadas y el workflow completo antes de la entrega final;
el resultado está registrado en la sección 12.

La reproducción local con trazas encontró además la misma espera implícita de 5 s en detalle
y producto nuevo: ambos fallaron mientras cargaban el grafo de módulos Vite, con respuestas
HTTP 200 y sin page errors ni errores de consola. Se alinea únicamente la espera de mounted
de esos casos a 45 s; las aserciones comerciales conservan sus límites. La prueba operativa
completa pasó en esa reproducción y conserva su espera de 30 s; no se inventa una causa para
su incidente remoto aislado. No se tocaron lógica de aplicación, dependencias ni migraciones.

Tras el ajuste, `final-review-phase8-5.spec.ts` + `operations-phase7.spec.ts` pasaron 10/10
localmente; lint, formato y typecheck también pasaron. La validación remota del último SHA
sigue siendo condición obligatoria de entrega; un CI previo GREEN no reemplaza esa comprobación.

## 12. CI del ajuste verificado y estado de Release Candidate

Commit de QA: `6c6b2dff95c31d084b5bd7504553588c67659ea4`,
`test: synchronize hydration checks and retain failure diagnostics`.
[CI #13, run 37146653605](https://github.com/ViudaNegra17/ajksolutions-ecommerce/actions/runs/37146653605):
completed / SUCCESS para ese SHA exacto. Los 16 gates pnpm fueron verificados individualmente
en SUCCESS, incluidos E2E, visual, DB vacía y build. La espera administrativa de 30 s pasó
sin modificar su límite ni aserción; no se afirma una reparación de dominio para ese incidente aislado.

Este cierre posterior incorpora solo evidencia documental, sin alterar código de aplicación,
pruebas, schema, migraciones, dependencias ni PNGs. El reporte de entrega proporciona el SHA
del último commit documental y su run exacto, comprobados tras el push; no se requiere grabar
un hash autorreferencial en el archivo. Solo se entrega confirmación final después de su CI GREEN.

Resultado del candidato: implementación técnica validada; preproducción pendiente exclusivamente
del checklist comercial, legal e infraestructura. No se despliega producción ni se inicia fase 9.
