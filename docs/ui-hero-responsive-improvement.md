# Mejora responsive del Hero principal

> Actualización vigente: véase «Ajuste automático de márgenes y favicon oficial», al final. Las entregas anteriores se conservan como historial; el Hero actual usa el contenedor nativo de Nuxt UI, adapta su tamaño al viewport y mantiene la composición sin logo y las campañas separadas.

## Estado y alcance

**IMPLEMENTADO y validado localmente.** Hero público de Home sobre HEAD `c5401c7da9938572a57f7bdb2fbd4dd02a70111a`, revisado el 25 de octubre de 2026 (America/Guayaquil). Sin commit, push ni redeploy automático. La verificación remota de Vercel queda fuera de esta entrega local.

No se modifica Fase 9, administración, endpoints, autenticación, productos, servicios, checkout, inventario, Prisma ni migraciones. Sin dependencias nuevas, slider, vídeo, canvas ni recursos de imagen externos añadidos.

## Auditoría inicial

El Hero anterior estaba integrado en `app/pages/index.vue`. La página espera `useAsyncData('public-home', () => $fetch('/api/home'))`; selecciona el primer banner HOME_HERO y conserva sus campos title, subtitle, description, imageUrl, mobileImageUrl, ctaLabel y ctaUrl. El contenido secundario HOME_SECONDARY es independiente y no se cambia.

El logo oficial es `public/ajksolutions-official.png` (948×581), reutilizado mediante AppLogo. No hay otro asset tecnológico adecuado en public. Se mantiene el logo intacto, incluidos circuitos, colores, SOLUTIONS y eslogan, sin generación ni reinterpretación.

Problemas de presentación:

- Paso a dos columnas con lg sin distinguir relación de aspecto; 1024×1024 quedaba comprimido.
- CTA móviles con ancho de contenido y altura observada de 44 px.
- Panel fallback muy alto y con texto secundario dominante; competía con el mensaje principal.
- Jerarquía del headline y ritmo móvil mejorables.
- El banner dependía de una imagen válida, sin recuperación visual ante error de carga.

La referencia se compiló antes de conectar el nuevo componente. Las capturas before corresponden al build anterior, no a una recreación.

## Archivos

- `app/components/PublicHomeHero.vue`: presentación, composición responsive y fallback de imagen.
- `app/pages/index.vue`: reemplazo exclusivo del bloque Hero por el componente, conservando API, selección del banner, SEO y resto de Home.
- `tests/unit/home-hero.test.ts`: SSR, contenido administrable, imagen móvil, fallback y actualización de campaña.
- `scripts/verify-home-hero.mjs`: verificación reproducible de 16 viewports, navegación/teclado y comparación de recursos y métricas en producción local.
- `docs/hero-responsive/`: capturas comparativas representativas.
- Este documento. Solo los snapshots Home legítimamente afectados pueden actualizarse tras revisar sus diferencias.

## Propuesta e implementación

Un único componente, sin versiones duplicadas por dispositivo ni abstracciones adicionales. CSS scoped para no alterar otras secciones. UContainer y UButton mantienen el sistema existente; AppLogo conserva el asset oficial. No se añaden trust points: prioridad móvil a propuesta de valor y CTA, sin más altura ni iconos remotos.

El mensaje fallback conserva:

- TECNOLOGÍA CON ATENCIÓN DIRECTA.
- Para trabajar, crear y conectar., destacando conectar. en azul de marca.
- Equipos, licencias digitales y soporte técnico. Encuentra tu solución y coordina los siguientes pasos con AJKSolutionS.
- Ver productos → /productos y Solicitar servicio → /servicios.

Si existe campaña, sus textos y CTA prevalecen: no se hardcodean encima de la configuración administrativa.

### Desktop y laptop

Container máximo 90rem (1440 px), dos columnas aproximadamente 48/52 cuando el viewport tiene al menos 1024 px y relación de aspecto mínima 6:5. Tipografía fluida, gaps y padding contenidos. El panel blanco tiene borde azul claro, sombra suave y decoración CSS, sin neón ni fondos oscuros.

No se usa height:100vh. La altura de la composición depende del contenido; el panel tiene una caja reservada para evitar saltos al cargar imágenes.

### Square y tablet

Por debajo del umbral horizontal o en proporciones cuadradas, composición vertical con texto de ancho controlado y panel limitado a 40rem. A 1024×1024 el visual baja a 18rem de alto. En 1024×768 se mantienen dos columnas porque hay ancho horizontal real.

No hay JS de detección de viewport: SSR y cliente usan el mismo HTML y CSS decide el layout.

### Mobile

Por debajo de 640 px los CTA ocupan todo el ancho, tienen un mínimo de 48 px y separación de 12 px. El orden es eyebrow, headline, descripción, acciones y visual. Headline fluido y panel reducido, sin una pantalla inicial dominada por el logo.

Desde 640 px se permiten acciones horizontales con wrap; la composición continúa vertical en tablets. La matriz incluye también móviles de 320 px.

## Imágenes y compatibilidad de banners

El panel de campaña mantiene picture/source con mobileImageUrl para ≤639 px. La imagen declara 720×600 y se contiene, sin deformación ni recorte. Se reserva el mismo espacio visual antes de cargar.

Solo la imagen principal de campaña lleva eager/high; el logo de cabecera de ese panel no recibe prioridad alta adicional. En fallback, eager/high se aplica al logo del Hero. La imagen oficial sigue compartiendo URL con otras posiciones y el navegador puede reutilizarla.

Si la campaña no tiene imageUrl o se produce error, aparece el panel de marca. Sus textos y CTA permanecen. Al cambiar la URL desktop o móvil se reinicia el estado de error. No se modifica el endpoint ni se crea un banner en DB para demostrarlo: las pruebas del componente usan fixtures.

No se cambia el uso global de Nuxt Image; para el logo ya existente se reutiliza AppLogo y para la campaña se conserva picture, compatible con su source administrable.

## Accesibilidad

- Una section etiquetada por el h1 existente home-hero.
- Texto real seleccionable, enlaces reales de navegación y orden DOM coherente.
- CTA con foco visible; se verifica Tab, Shift+Tab y Enter.
- Texto principal oscuro y azul AJKSolutionS sobre superficies claras; sin depender solo del color para identificar acciones.
- Logo con alt AJKSolutionS; imagen de campaña con título como alt.
- Decoración exclusivamente en pseudo-elementos CSS, fuera del árbol accesible.
- Se conserva prefers-reduced-motion global; no se añaden animaciones permanentes.
- Títulos administrables extensos pueden ocupar más líneas; no se truncan.

Contrastes calculados sobre los colores utilizados: blanco/azul #075e90, 6.97:1; azul #075e90 sobre #eff8ff, 6.49:1; descripción #343a40 sobre #eff8ff, 10.71:1; caption #59636e sobre blanco, 6.11:1. Se verificaron Tab, Shift+Tab y Enter con Chromium. No se realizó una auditoría WCAG completa con lector de pantalla.

## Validación visual y responsive

Matriz requerida: 320×568, 360×800, 375×812, 390×844, 412×915, 430×932, 768×1024, 820×1180, 1024×768, 1024×1024, 1280×720, 1366×768, 1440×900, 1536×864, 1920×1080 y 2560×1440.

El verificador mide overflow de documento y Hero, geometría de headline/CTA/imágenes, estado HTTP y errores de página/hidratación. Las capturas son recortes del Hero real en navegador, no mockups.

| Viewport  | Antes                                         | Después                                        |
| --------- | --------------------------------------------- | ---------------------------------------------- |
| 390×844   | [Antes](hero-responsive/before-390x844.png)   | [Después](hero-responsive/after-390x844.png)   |
| 768×1024  | [Antes](hero-responsive/before-768x1024.png)  | [Después](hero-responsive/after-768x1024.png)  |
| 1024×1024 | [Antes](hero-responsive/before-1024x1024.png) | [Después](hero-responsive/after-1024x1024.png) |
| 1366×768  | [Antes](hero-responsive/before-1366x768.png)  | [Después](hero-responsive/after-1366x768.png)  |
| 1920×1080 | [Antes](hero-responsive/before-1920x1080.png) | [Después](hero-responsive/after-1920x1080.png) |

## Performance before/after

Se mide el mismo flujo de producción local, con proceso propio y secretos efímeros, PostgreSQL local de solo lectura para estas capturas, servidor previamente consultado y contextos de navegador nuevos. No son métricas de Vercel ni prueba de carga; LCP varía con carga del equipo.

Datos crudos ignorados por git en `logs/hero-responsive/before.json` y `after.json`. No se comparan estas muestras directamente con la auditoría del 19 de octubre: el HEAD y las condiciones han cambiado.

Desktop 1920×1080, tres contextos de navegador nuevos por estado:

| Métrica                               | Antes              | Después final      |
| ------------------------------------- | ------------------ | ------------------ |
| HTML sin compresión CDN               | 36,528 B           | 41,107 B           |
| Recursos JS medidos, incluye prefetch | 37                 | 37                 |
| Transferencia JS local                | 815,862 B          | 816,457 B          |
| Transferencia CSS local               | 210,072 B          | 214,521 B          |
| Requests al corte                     | 40 / 39 / 39       | 40 / 40 / 40       |
| LCP aproximado                        | 652 / 476 / 460 ms | 448 / 396 / 360 ms |
| CLS observado                         | 0 / 0 / 0          | 0 / 0 / 0          |
| Alto del Hero                         | 663.28 px          | 609 px             |

El aumento es 595 B de JS y 4,449 B de CSS transferidos localmente. El HTML crece 4,579 B, principalmente por los estilos scoped críticos que Nuxt incorpora al SSR. Hay una petición de CSS de página adicional; no se oculta ese costo. No se añadió ninguna imagen, fuente o dependencia externa. La imagen principal sigue siendo el PNG oficial y el LCP final desktop se identificó como IMG con esa URL.

La mediana final LCP es 396 ms frente a 476 ms, pero no demuestra una mejora causal. Otra pasada del mismo build final dio 576/424/552 ms (conservada en after-final-build-first-pass.json); la variación supera las diferencias pequeñas entre pruebas. Las pasadas exploratorias se hicieron mientras se validaban otros procesos. No se observa una regresión grande sostenida en este control local, pero no se certifica rendimiento de campo ni Vercel.

El chunk administrativo preexistente continúa: antes Ca1Ng1rB.js, identificado en la auditoría previa y presente en la captura de red before; después DkCUMbP0.js, confirmado por contenido admin-sidebar, 117,505 B raw. Un cambio de hash no significa una nueva dependencia. El Hero no importa layouts, formularios ni componentes administrativos; no se intenta resolver aquí esa descarga.

Resultado de la matriz: 16/16 tamaños con HTTP 200, sin overflow del Hero ni del documento, sin console.error, pageerror ni mismatch. CLS observado 0 en todas las muestras. El headline fallback ocupa dos líneas, sin cortes de palabras, en los tamaños verificados.

| Viewport  | Alto antes → después, px | Composición final                     |
| --------- | ------------------------ | ------------------------------------- |
| 320×568   | 858.98 → 700.44          | Vertical; CTA 288×48                  |
| 360×800   | 831.52 → 671.64          | Vertical; CTA 328×48                  |
| 375×812   | 840.70 → 671.64          | Vertical; CTA 343×48                  |
| 390×844   | 849.91 → 671.64          | Vertical; CTA 358×48                  |
| 412×915   | 863.39 → 675.77          | Vertical; CTA 380×48                  |
| 430×932   | 874.42 → 679.33          | Vertical; CTA 398×48                  |
| 768×1024  | 960.16 → 750.08          | Vertical centrada                     |
| 820×1180  | 992.02 → 752.77          | Vertical centrada                     |
| 1024×768  | 612.83 → 407.41          | Dos columnas                          |
| 1024×1024 | 612.83 → 740.17          | Vertical centrada, sin compresión     |
| 1280×720  | 663.28 → 461.77          | Dos columnas                          |
| 1366×768  | 663.28 → 492.72          | Dos columnas; CTA dentro del viewport |
| 1440×900  | 663.28 → 519.38          | Dos columnas                          |
| 1536×864  | 663.28 → 553.95          | Dos columnas                          |
| 1920×1080 | 663.28 → 609.00          | Dos columnas                          |
| 2560×1440 | 663.28 → 609.00          | Dos columnas, container limitado      |

La mayor altura a 1024×1024 es intencional: reemplaza dos columnas comprimidas por una composición vertical. No se afirma que todos los viewports sean más bajos.

El verificador conserva HTML bytes, JS de recursos por URL, requests, CSS, LCP y CLS. Los recursos medidos hasta el corte incluyen prefetch; no se presentan como bundle crítico puro. Se comprueba que el Hero no importe módulos, layouts ni formularios admin. Si la descarga administrativa anterior continúa, se documenta sin ampliar el alcance.

## QA y reproducción

```powershell
pnpm build
node scripts/verify-home-hero.mjs before
# Aplicar la mejora del Hero
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
node scripts/verify-home-hero.mjs after
# Visuales existentes: solamente Home
node scripts/run-visual-tests.mjs --screens=home
```

El script del Hero comprueba que DATABASE_URL sea local, levanta únicamente su runtime en 127.0.0.1:3015 y lo cierra al terminar. No imprime secretos ni modifica la DB. No ejecutar simultáneamente otro servidor en ese puerto.

Las pruebas que escriben fixtures deben correr en una DB temporal aislada, no en la base comercial. Los scripts existentes de visual/integración eliminan solo su base generada al terminar. No se añaden migraciones ni se cambia su lógica.

Resultados:

| Verificación            | Resultado                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm lint               | PASS                                                                                                                                              |
| pnpm format:check       | PASS                                                                                                                                              |
| pnpm typecheck          | PASS                                                                                                                                              |
| pnpm test completo      | PASS: 21 archivos, 147 pruebas, en DB temporal aislada                                                                                            |
| Pruebas nuevas del Hero | PASS: 4; SSR, campaña administrable, imagen ausente y error/cambio de campaña                                                                     |
| Build final             | PASS, SSR node-server local                                                                                                                       |
| E2E diagnóstico         | PASS: 16 viewports + 2 muestras adicionales; CTA a Productos y Servicios tecnológicos; Tab/Shift+Tab/Enter; sin errores de consola/JS/hidratación |
| Visual Home existente   | PASS: 2 tests, 390 y 1440 px, repetidos sin update después de actualizar solo los dos snapshots afectados                                         |
| Capturas comparativas   | 5 antes + 5 después, revisadas visualmente                                                                                                        |

No se ejecutó toda la suite E2E administrativa, ajena al alcance. Se ejecutó la suite completa de Vitest y los visuales existentes relacionados con Home. Los avisos previos de pg, DEP0190 del runner y NO_COLOR/FORCE_COLOR aparecieron en herramientas/servidor; no se intentó corregirlos preventivamente ni se confundieron con errores de consola del navegador.

Las bases temporales de Vitest y de ambas ejecuciones visuales fueron eliminadas por sus verificadores al terminar; no se eliminó ni cambió información comercial. El build conserva la advertencia de sharp win32: un despliegue Linux debe construir para su plataforma, no subir el artefacto Windows local.

## Riesgos y mejoras futuras

- Vercel no se redeploya ni se certifica sano desde esta intervención visual. El error remoto previo requiere su propio diagnóstico; no se modifica runtime/env para ocultarlo.
- Campañas reales pueden tener texto e imágenes más largos; se conserva wrap y contain en vez de recorte. Fixtures verifican contrato y fallback, sin afirmar que se haya revisado toda campaña futura.
- No se soluciona la carga de código admin en Home salvo implicación directa del Hero; el nuevo componente no lo importa.
- No se refactorizan los iconos globales; se conserva solo la flecha Lucide ya usada.
- Futuras mejoras de assets tecnológicos requieren un recurso de marca aprobado; no se usa una imagen aleatoria ni se redibuja el logo.

## Asset definitivo — actualización vigente

Esta sección documenta la segunda entrega, con la Imagen 4 que incluía un logo integrado. Fue sustituida por el apartado final «Reemplazo de asset visual»; se conserva como historial y baseline.

**Estado: IMPLEMENTADO y validado localmente; QA global paralelo con incidencia pendiente.** No hay commit, push ni redeploy. HEAD permanece c5401c7da9938572a57f7bdb2fbd4dd02a70111a más los cambios de trabajo descritos.

### Asset aprobado y procedencia

- Asset definitivo: **Imagen 4**, «Soluciones tecnológicas en azul y blanco.png», aportado por el usuario.
- Uso: Hero institucional AJKSolutionS.
- Categorías representadas: equipos, licencias digitales, insumos, accesorios, herramientas, soporte y servicio técnico.
- Marcas externas: ninguna añadida. Se utiliza la composición aprobada, sin complementar con imágenes o marcas de terceros.
- Imágenes 1–3: solo referencias conceptuales desktop/mobile/square. No se copiaron a public ni se usan como fondos o capturas de interfaz.

| Dato                 | Original        | Producción        |
| -------------------- | --------------- | ----------------- |
| Formato              | PNG             | WebP              |
| Dimensiones          | 1448×1086       | 1448×1086         |
| Peso                 | 1,889,800 bytes | 165,820 bytes     |
| Proporción           | 4:3             | 4:3               |
| Color                | sRGB            | sRGB              |
| Calidad              | Fuente recibida | WebP 88, effort 6 |
| Recorte o reencuadre | Ninguno         | Ninguno           |

Reducción aproximada del 91.2 %. Se evaluaron calidades 82 (127,338 B), 85 (145,730 B) y 88 (165,820 B); se eligió 88 por el detalle de herramientas y marca, todavía muy por debajo del presupuesto orientativo 300–450 KB. Conversión con Sharp ya instalado, sin dependencias nuevas ni generación de imágenes. No se modificó el original de Downloads. La conversión WebP se revisó visualmente.

Única composición gráfica nueva: Imagen 4. Se guarda el maestro `public/images/hero/ajksolutions-hero-ecosystem.webp` y tres tamaños derivados del mismo WebP, sin recorte: 448×336 (33,424 B), 640×480 (53,154 B) y 752×564 (66,010 B). No se agrega un PNG duplicado ni se incorporan los mockups.

Los tamaños estáticos se justifican por la medición: con IPX dinámico el asset desktop requirió 272–436 ms por petición de imagen y el LCP mediano pasó de 428 a 608 ms. El srcset nativo selecciona ahora archivos ya optimizados, evitando ese procesamiento en navegadores modernos sin cambiar el proveedor global ni la configuración de Nuxt, Vercel o Neon. No son nuevas escenas ni art direction.

### Decisión explícita sobre HOME_HERO

Se adopta **B: Imagen 4 como visual institucional fijo**. El Hero conserva copy y enlaces institucionales reales. Un banner administrativo ya no sustituye su imagen, h1 o CTA principales.

Para conservar el contenido administrable, el primer HOME_HERO se muestra como primera campaña en la sección comercial ya existente, después de Soluciones AJKSolutionS y antes de los HOME_SECONDARY. Conserva título, subtítulo, descripción, imagen desktop, variante móvil y CTA. La sección no aparece si no hay campañas; PRODUCTS_TOP no se mezcla en Home.

Este cambio de presentación es deliberado y no modifica placements, validaciones, formularios, permisos, API, base de datos ni programación de campañas. No se hace una migración ni se descarta el banner. Las imágenes de campaña continúan lazy, sin prioridad alta.

### Implementación y archivos de esta ampliación

- `public/images/hero/ajksolutions-hero-ecosystem.webp`: Imagen 4 optimizada.
- `app/components/PublicHomeHero.vue`: NuxtImg institucional, copy fijo, una sola imagen, sin logo superpuesto.
- `app/components/PublicHomeCampaigns.vue`: presentación separada del banner administrable y campañas secundarias, reutilizando el diseño comercial existente.
- `app/pages/index.vue`: conecta ambos componentes al flujo existente; se conserva useAsyncData, API y SEO.
- `tests/unit/home-hero.test.ts`: siete pruebas del contrato institucional, fallback y compatibilidad de campañas.
- `scripts/verify-home-hero.mjs`: etiquetas asset-before/asset-after, evidencia SSR/srcset, validación del asset cargado y métricas de imágenes/transferencia.
- Capturas asset-before/asset-after y únicamente los snapshots Home afectados.
- Este documento.

Se conserva el ajuste tipográfico local encontrado en el título: no se reintroduce un cambio de color sobre el texto editado por el usuario. No se cambia el logo del header ni se añaden beneficios que empujen los CTA.

### Desktop, square/tablet y mobile

Desktop horizontal: dos columnas aproximadamente 45/55, container máximo 1440 px, visual grande con borde y sombra suaves. A 1024×768 se mantienen dos columnas; en 1024×1024 se apilan texto, CTA y visual centrado. Se conserva el umbral de proporción 6:5 para evitar compresión.

Mobile menor de 768 px: copy → Ver productos → Solicitar servicio → Imagen 4. Acciones en columna, ancho completo y mínimo 48 px. La imagen llena el ancho disponible con proporción 4:3 y height:auto, sin alturas gigantes ni posicionamiento mediante JS.

El visual usa aspect-ratio 4/3, dimensiones explícitas y object-fit:contain. No hay cover, zoom, crop, overlays comerciales ni otro logo sobre el asset. Si el asset falla, se reemplaza por el logo oficial en la misma caja; no se duplica mientras carga correctamente.

### Nuxt Image, SSR y prioridad

Se utiliza el NuxtImg ya disponible en @nuxt/image 2.1.0:

```vue
<NuxtImg
  src="/images/hero/ajksolutions-hero-ecosystem.webp"
  alt="Equipos, licencias digitales, accesorios, herramientas y soporte técnico de AJKSolutionS"
  width="1448"
  height="1086"
  sizes="100vw sm:640px lg:55vw xl:752px"
  srcset="/images/hero/ajksolutions-hero-ecosystem-448.webp 448w, /images/hero/ajksolutions-hero-ecosystem-640.webp 640w, /images/hero/ajksolutions-hero-ecosystem-752.webp 752w, /images/hero/ajksolutions-hero-ecosystem.webp 1448w"
  format="webp"
  :quality="88"
  loading="eager"
  fetchpriority="high"
/>
```

Misma escena en todas las resoluciones. NuxtImg mantiene SSR, dimensiones, atributos y cálculo de sizes; el atributo HTML srcset utiliza cuatro anchuras estáticas. Se comprobó en el runtime instalado que NuxtImg transmite ese atributo al img. El navegador elige una sola versión según ancho/densidad. No se introduce picture con otras imágenes institucionales ni un proveedor nuevo. El src de respaldo que calcula NuxtImg sigue siendo válido mediante el proveedor existente; la selección efectiva de los navegadores probados evita IPX.

El HTML SSR incluye la imagen y el srcset, sin ClientOnly ni ssr:false. Se reserva el espacio antes de descargar. Se aplica eager/high a un solo visual por su relevancia desktop; en móviles bajos puede quedar después del primer viewport, pero no se añade lógica de viewport o hidratación para alternar lazy. Las mediciones determinan el LCP real, no la intuición.

### Accesibilidad y funcionalidad

Se mantiene un único h1 y copy seleccionable; los CTA son enlaces a /productos y /servicios con foco visible. El alt es descriptivo y moderado. La ilustración no reemplaza ningún texto, botón ni navegación. Sin animaciones nuevas ni interferencia con reduced-motion.

Las pruebas del componente verifican la ausencia de otro logo en el Hero normal, recuperación del asset fallido, contenido SSR y conservación de campañas. El verificador de navegador valida el asset real servido, no solo un mock de NuxtImg.

### Comparación actual del asset

Baseline de esta ampliación: build del Hero previo, incluido el ajuste local del título, sobre el árbol con la entrega anterior aún sin commit. Registros `logs/hero-responsive/asset-before.json` y `asset-after.json`, sin sobrescribir las métricas de la primera entrega. El primer ensayo dinámico se conserva como asset-after-ipx.json. Contextos de navegador nuevos y runtime de producción local, no pnpm dev; servidor previamente consultado. No se afirma cold start de función ni rendimiento de Vercel.

Producción local, desktop 1920×1080, tres contextos nuevos por estado:

| Métrica                                  | Antes: logo         | Imagen 4 con IPX, ensayo intermedio | Imagen 4 estática, final |
| ---------------------------------------- | ------------------- | ----------------------------------- | ------------------------ |
| LCP, ms                                  | 360 / 464 / 428     | 504 / 680 / 608                     | 420 / 428 / 364          |
| Mediana LCP                              | 428 ms              | 608 ms                              | 420 ms                   |
| TTFB, ms                                 | 62.5 / 111.4 / 88.8 | 105.7 / 72.3 / 121.7                | 78.0 / 85.9 / 70.9       |
| CLS                                      | 0 / 0 / 0           | 0 / 0 / 0                           | 0 / 0 / 0                |
| Requests al corte                        | 40                  | 41                                  | 41                       |
| Recursos JS, incluye prefetch            | 37                  | 37                                  | 37                       |
| Transferencia JS local                   | 816,454 B           | 816,404 B                           | 816,633 B                |
| Transferencia CSS local                  | 214,521 B           | 213,705 B                           | 213,705 B                |
| HTML local                               | 41,107 B            | 40,963 B                            | 40,493 B                 |
| Transferencia total de recursos al corte | 1,105,530 B         | 1,172,272 B                         | 1,171,203 B              |

La selección desktop real es ecosystem-752.webp, 752×564, 66,010 B de archivo / 66,310 B de transferencia observada. Su duración bajó de 272–436 ms en el ensayo IPX a 65–120 ms servido estáticamente. El navegador no solicitó IPX para el asset en la pasada final. El srcset no descarga las cuatro versiones.

Respecto del logo compartido anterior se añade una petición y 65,673 B de recursos totales (~5.9 %), porque el header conserva su PNG y el Hero ahora tiene una composición independiente. JS aumenta solo 179 B, CSS baja 816 B y HTML baja 614 B en este control. No se afirma que añadir una ilustración sea gratis ni que 8 ms de diferencia mediana de LCP prueben una mejora causal.

En 390×844 la imagen elegida es ecosystem-448.webp: 33,424 B de archivo / 33,724 B de transferencia; LCP 248 → 260 ms y TTFB 60.3 → 66.0 ms, una muestra por estado. CLS 0. Transferencia total 1,081,878 → 1,114,965 B (~3.1 % adicional). El Hero mide 716.14 px y ambos CTA siguen antes del visual, con 358×48 px.

El LCP final desktop se identificó como la Imagen 4; el baseline era el logo oficial. No se detecta una regresión relevante sostenida en estas muestras locales después de eliminar la transformación dinámica, pero no se certifican móviles reales, redes lentas, CDN, p95 o Vercel. No confundir compresión del PNG original con transferencia real elegida por srcset.

Resultado responsive final: 16/16 viewports, todos HTTP 200; sin overflow, console.error, pageerror ni mismatch, CLS observado 0 en todos. Alturas representativas: 692.44 px en 320×568, 716.14 en 390×844, 910.08 en 768×1024, 932.17 en 1024×1024, 627.61 en 1366×768 y 689.50 en 1920×1080. El aumento frente al card del logo es deliberado para mostrar toda la escena, sin hacer un Hero móvil de varias pantallas.

Al sustituir el maestro deben regenerarse sus tres tamaños con el mismo encuadre y actualizarse juntos. Derivados actuales: resize sin enlarging desde el WebP maestro, quality 88 y effort 6; no dependen del archivo externo de Downloads durante build o ejecución.

### Evidencia visual de esta ampliación

| Viewport  | Antes del asset                                     | Asset definitivo                                     |
| --------- | --------------------------------------------------- | ---------------------------------------------------- |
| 390×844   | [Antes](hero-responsive/asset-before-390x844.png)   | [Después](hero-responsive/asset-after-390x844.png)   |
| 768×1024  | [Antes](hero-responsive/asset-before-768x1024.png)  | [Después](hero-responsive/asset-after-768x1024.png)  |
| 1024×1024 | [Antes](hero-responsive/asset-before-1024x1024.png) | [Después](hero-responsive/asset-after-1024x1024.png) |
| 1366×768  | [Antes](hero-responsive/asset-before-1366x768.png)  | [Después](hero-responsive/asset-after-1366x768.png)  |
| 1920×1080 | [Antes](hero-responsive/asset-before-1920x1080.png) | [Después](hero-responsive/asset-after-1920x1080.png) |

Se evalúa composición conceptual, no comparación pixel-perfect con los mockups. Las capturas de UI son evidencia en docs, no assets servidos por la aplicación.

### QA de esta ampliación

| Verificación actual               | Resultado                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| pnpm lint                         | PASS                                                                                                      |
| pnpm format:check                 | PASS                                                                                                      |
| pnpm typecheck                    | PASS                                                                                                      |
| Pruebas específicas Hero/campañas | 7 PASS                                                                                                    |
| pnpm test, paralelo por defecto   | 149 PASS, 1 FAIL en dashboard                                                                             |
| pnpm test --no-file-parallelism   | 150 PASS, 21 archivos                                                                                     |
| pnpm build                        | PASS                                                                                                      |
| Producción local /                | HTTP 200, asset y srcset en SSR                                                                           |
| Responsive/E2E dirigido           | 16 viewports PASS, sin overflow/errores JS o consola/mismatch; Tab/Shift+Tab/Enter y ambas rutas CTA PASS |
| Visuales existentes Home          | 2 PASS, 390 y 1440; actualización limitada a esos snapshots y repetición sin update PASS                  |
| Capturas de esta ampliación       | 5 antes + 5 después, revisadas visualmente                                                                |
| Git/alcance                       | Sin cambios en Prisma, migraciones, server, shared, dependencias ni configuración Nuxt/Vercel/Neon        |

Las 16 comprobaciones de producción local mantuvieron CLS 0 y mostraron el asset real, no el fallback. No se ejecutó toda la suite E2E administrativa ni se certificó producción remota. Los listeners de prueba 3013/3015 quedaron cerrados.

Reproducción actual: pnpm build y node scripts/verify-home-hero.mjs asset-after. El registro asset-before se capturó antes del cambio, no reconstruye automáticamente un checkout anterior. Para verificar snapshots sin cambiarlos: node scripts/run-visual-tests.mjs --screens=home.

La primera ejecución de pnpm test con paralelismo tuvo 149 PASS y 1 FAIL en operations-phase7.test.ts: dashboardService.get intenta leer row.customer.firstName con customer null, en server/services/operations.service.ts:307. Sin cambios de backend, pnpm test --no-file-parallelism pasó 150/150. Hay sensibilidad a la ejecución compartida entre archivos; la causa definitiva del null no quedó aislada. No se modifican servicios, consultas ni configuración global de Vitest para ocultarlo. Se registra como incidencia ajena al Hero que requiere revisión separada.

Ambas bases temporales de la suite fueron eliminadas al terminar, incluso la ejecución fallida. La base comercial no fue modificada.

### Riesgos pendientes

No hay deploy ni cambios Vercel/Neon. La producción remota no se certifica desde un build Windows. La descarga de código administrativo preexistente no se amplía como parte del Hero ni se refactoriza aquí. Las campañas se conservan como contenido comercial separado; su nueva posición debe considerarse al planificar contenidos.

No se avanza a Fase 9.

## Reemplazo de asset visual

**Estado: IMPLEMENTADO y validado localmente el 25 de octubre de 2026.** Sin cambios de componentes o estilos; no hay commit, push ni despliegue remoto.

### Alcance y motivo

Reemplazo controlado del visual institucional por «Composición tecnológica futurista en azul y blanco.png», proporcionado por el usuario. La ausencia del logo grande y el espacio superior limpio son intencionales: no se rellenan con logos, copy, badges ni promociones. No hay segundo rediseño.

Esta sección sustituye como descripción vigente a las entregas anteriores, conservadas como historial. Se mantuvieron los cambios de trabajo preexistentes, sin reset, commit, push ni cambios de backend.

### Implementación anterior auditada

PublicHomeHero ya tenía un único layout SSR, NuxtImg, width/height reales, sizes, srcset estático, object-fit:contain y proporción 4:3. Se verificó el baseline desde el artefacto productivo anterior: los cuatro archivos .output/public coincidían por SHA-256 con los assets anteriores de public.

Se conservan el container, proporciones 45/55, padding, gaps, tipografía, fondo, radius, sombras, copy, CTA, jerarquía h1 y orden DOM. Desktop horizontal mantiene dos columnas; square/tablet conserva la transición a columna según espacio y proporción; móvil mantiene ambos CTA antes de la imagen.

HOME_HERO y HOME_SECONDARY permanecen separados como campañas administrables, sin cambios. No se modifican DTO, API, programación ni panel administrativo.

### Asset anterior y nuevo

Se conservan los nombres semánticos existentes para no tocar referencias ni introducir cambios indirectos de componente. El contenido de los cuatro WebP fue reemplazado y sus dimensiones se mantienen:

| Archivo bajo public/images/hero/     | Anterior con logo | Nuevo sin logo | Dimensiones |
| ------------------------------------ | ----------------: | -------------: | ----------- |
| ajksolutions-hero-ecosystem.webp     |         165,820 B |      143,218 B | 1448×1086   |
| ajksolutions-hero-ecosystem-448.webp |          33,424 B |       27,802 B | 448×336     |
| ajksolutions-hero-ecosystem-640.webp |          53,154 B |       45,052 B | 640×480     |
| ajksolutions-hero-ecosystem-752.webp |          66,010 B |       55,970 B | 752×564     |

Original nuevo: PNG de 1,859,656 B, 1448×1086 px. Maestro de producción: WebP quality 88 / effort 6, reducción aproximada del 92.3 % frente al PNG y 13.6 % frente al maestro WebP anterior. Variantes generadas desde el maestro, sin ampliación ni recorte. No se añadieron dependencias ni imágenes ajenas.

Se revisó la conversión: laptop, monitor, torre, periféricos, herramientas, insumos y elementos inferiores permanecen completos. El espacio superior y la ausencia de marca dentro del bitmap se conservan.

El logo del header no cambia. No se agrega un logo sobre la nueva imagen. El fallback de error ya existente solo reemplaza una imagen que no carga; no es un overlay y no aparece con el asset cargado correctamente.

### Auditoría de directrices anteriores

| Categoría        | Hallazgo y acción                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Visual        | Cambio solicitado: quitar del bitmap el gran logo integrado usando la nueva imagen aprobada. No se alteran composición CSS, fondo, radius, sombra o headline. |
| B. Responsive    | Reglas existentes adecuadas para la misma proporción 4:3; se conservan sin nuevos breakpoints.                                                                |
| C. Accesibilidad | Alt existente sigue describiendo equipos, licencias conceptuales, accesorios, herramientas y soporte. Se conservan foco, teclado y un h1.                     |
| D. Performance   | Se mantiene el srcset estático ya optimizado; no se vuelve a introducir transformación IPX por petición en los navegadores probados.                          |
| E. Funcional     | Copy, enlaces /productos y /servicios, SSR y campañas conservados. No se aborda el dashboard ni la incidencia de paralelismo de una entrega anterior.         |

No se detectó una razón para modificar componentes o estilos solo por incorporar este asset. Verificación final por SHA-256: PublicHomeHero.vue, PublicHomeCampaigns.vue y app/pages/index.vue permanecen idénticos byte por byte. Los cuatro assets del build coinciden con los nuevos archivos fuente.

### Archivos afectados por este reemplazo

- Los cuatro WebP de la tabla anterior.
- scripts/verify-home-hero.mjs: solo etiquetas replace-before/replace-after y reutilización de verificaciones existentes para la imagen institucional.
- docs/ui-hero-responsive-improvement.md: esta sección y aviso de cuál entrega está vigente.
- `docs/hero-responsive/replace-before-*.png` y `replace-after-*.png`: evidencia de esta intervención.
- Dos snapshots relacionados: tests/e2e/visual-phase7-5.spec.ts-snapshots/home-390-chromium-win32.png y home-1440-chromium-win32.png, únicamente si la diferencia corresponde a la nueva imagen.

Componentes modificados en esta intervención: ninguno. Estilos modificados: ninguno. Tests unitarios modificados: ninguno. Los componentes y tests nuevos que aparecen en git status provienen de la entrega anterior sin commit; no se atribuyen a este reemplazo.

Copia recuperable de los cuatro assets anteriores: logs/hero-replacement/previous/. Candidatos y metadata/SHA-256: logs/hero-replacement/candidate/ y metadata.json. Son archivos diagnósticos ignorados por git, no publicados. No se eliminó la versión anterior sin respaldo.

### Nuxt Image, prioridad y SSR

Se conservan src y srcset, dimensiones 1448×1086, sizes="100vw sm:640px lg:55vw xl:752px", format WebP, quality 88, loading eager y fetchpriority high de la estrategia ya medida. No se reconfiguran Nuxt Image, Nitro, Vercel o Neon.

Solo se sustituye el contenido de los archivos. El nuevo bitmap no tiene texto de UI ni reemplaza headline, descripción o enlaces. La imagen se renderiza en SSR; no se usa ClientOnly, JavaScript responsive, resize listeners, canvas ni librerías.

### Evidencia de responsive

Matriz: 320×568, 360×800, 375×812, 390×844, 412×915, 430×932, 768×1024, 820×1180, 1024×768, 1024×1024, 1280×720, 1366×768, 1440×900, 1536×864, 1920×1080 y 2560×1440.

| Viewport  | Asset anterior                                        | Nuevo asset                                            |
| --------- | ----------------------------------------------------- | ------------------------------------------------------ |
| 390×844   | [Antes](hero-responsive/replace-before-390x844.png)   | [Después](hero-responsive/replace-after-390x844.png)   |
| 768×1024  | [Antes](hero-responsive/replace-before-768x1024.png)  | [Después](hero-responsive/replace-after-768x1024.png)  |
| 1024×1024 | [Antes](hero-responsive/replace-before-1024x1024.png) | [Después](hero-responsive/replace-after-1024x1024.png) |
| 1366×768  | [Antes](hero-responsive/replace-before-1366x768.png)  | [Después](hero-responsive/replace-after-1366x768.png)  |
| 1920×1080 | [Antes](hero-responsive/replace-before-1920x1080.png) | [Después](hero-responsive/replace-after-1920x1080.png) |

### Performance y regresión

Baseline y resultado: logs/hero-responsive/replace-before.json y replace-after.json. Contextos Chromium nuevos y runtime de producción local; servidor consultado previamente. No son métricas de cold start remoto ni de Vercel. No se sobrescriben los ensayos anteriores.

Geometría: igualdad exacta en las 18 muestras (16 viewports únicos más dos repeticiones desktop) de cajas del Hero, h1, CTA e imagen; se compararon también textos y href de los CTA. No cambió padding, tamaño, posición o altura. Informe automático en logs/hero-replacement/comparison.json.

| Métrica desktop 1920×1080                    | Antes                        | Después                |
| -------------------------------------------- | ---------------------------- | ---------------------- |
| LCP, 3 muestras                              | 328 / 508 / 380 ms           | 676 / 408 / 352 ms     |
| Mediana LCP                                  | 380 ms                       | 408 ms                 |
| TTFB, 3 muestras                             | 58.7 / 112.0 / 62.6 ms       | 130.4 / 63.5 / 69.9 ms |
| CLS                                          | 0 / 0 / 0                    | 0 / 0 / 0              |
| Imagen seleccionada, archivo / transferencia | 66,010 / 66,310 B            | 55,970 / 56,270 B      |
| Recursos JS medidos                          | 37                           | 37                     |
| JS / CSS / HTML                              | 816,633 / 213,705 / 40,493 B | Sin cambios            |
| Requests al corte                            | 41                           | 41                     |
| Transferencia total al corte                 | 1,171,203 B                  | 1,161,163 B            |

Se descargó la variante estática de 752 px en desktop, sin transformación IPX. La transferencia baja 10,040 B. El LCP real sigue siendo IMG; la subida mediana de 28 ms y la muestra de 676 ms se conservan, no se descartan. Tres muestras locales no permiten atribuir la variación temporal al asset ni prometer una mejora causal. No se observa incremento sostenido grande en este control; los bytes bajan y no hay nuevo JS, CSS o HTML.

Mobile 390×844, una muestra por estado: LCP 284 → 276 ms; TTFB 67.1 → 71.5 ms; transferencia de imagen 33,724 → 28,102 B; total 1,114,965 → 1,109,343 B. 35 requests y 31 recursos JS, sin cambios. CLS 0. La geometría permanece idéntica, incluidos CTA de 358×48 px antes del visual.

Resultado responsive/producción local: 16/16 tamaños HTTP 200, imagen real y srcset presentes en SSR, object-fit:contain, sin overflow, console.error, pageerror ni hydration mismatch. Se verificaron Tab, Shift+Tab, Enter y navegación a Productos y Servicios tecnológicos. No se certifican redes lentas, dispositivos físicos, p95 o Vercel.

### QA de este reemplazo

| Control                                           | Resultado actual                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| pnpm lint                                         | PASS                                                                       |
| pnpm format:check                                 | PASS                                                                       |
| pnpm typecheck                                    | PASS                                                                       |
| pnpm test por defecto, sin flags de serialización | PASS: 150 pruebas, 21 archivos                                             |
| pnpm build                                        | PASS                                                                       |
| E2E dirigido / responsive                         | PASS: 16 viewports, sin errores, geometría idéntica                        |
| Visual Home                                       | PASS: dos snapshots Home regenerados y dos tests repetidos sin update PASS |
| Capturas                                          | Cinco antes y cinco después; nuevas capturas revisadas visualmente         |

La incidencia paralela de dashboard de la entrega anterior no se reprodujo en esta ejecución. No fue corregida por este reemplazo: servicios y configuración de Vitest no se modificaron. Se conserva el riesgo histórico de intermitencia, sin atribuir su desaparición a una imagen.

La suite se ejecutó en una base temporal local aislada, eliminada al finalizar; no se cambiaron datos comerciales. No se ejecutó toda la suite E2E administrativa, ajena al alcance.

La tolerancia full-page permitía aprobar el bitmap anterior con el modo changed predeterminado. Se regeneraron exclusivamente los snapshots Home 390 y 1440 mediante --update-snapshots=all y VISUAL_SCREEN_FILTER=home, en una base temporal; después pasaron ambos tests sin actualización. No se cambió la tolerancia ni se actualizaron snapshots ajenos. Los goldens guardados ya muestran la imagen sin logo y se revisaron visualmente.

Las bases temporales de los visuales fueron eliminadas. Los listeners de prueba 3013/3015 quedaron cerrados; no se modificaron datos comerciales.

Reproducción después del reemplazo: pnpm build, luego node scripts/verify-home-hero.mjs replace-after. El baseline replace-before fue capturado antes de reconstruir con los nuevos archivos; la etiqueta no restaura versiones anteriores automáticamente.

### Límites y pendientes

Sin modificación de Prisma, schema, migraciones, servicios, endpoints, checkout, carrito, usuarios, sesiones, permisos o RBAC. No hay despliegue remoto ni certificación de Vercel. No se inicia Fase 9.

## Ajuste automático de márgenes y favicon oficial

### Diagnóstico de la captura y documentación consultada

Se revisaron las introducciones oficiales de Nuxt y Nuxt UI, el contrato de UContainer y el componente instalado. El Hero ya usaba UContainer; no era necesario reemplazarlo ni añadir un sistema de detección de dispositivos.

Dos causas observadas:

1. La regla max-width:90rem de home-hero__layout anulaba el ancho central de Nuxt UI. Por ejemplo, a 1920 px el Hero usaba 1440 px, frente a 1280 del header.
2. La imagen se dimensionaba por ancho/aspect-ratio sin considerar ventanas bajas. No era un recorte del archivo ni necesariamente overflow horizontal: parte del visual quedaba por debajo del área visible.

UContainer gestiona el centrado y gutters mediante --ui-container. Se elimina la anulación local para heredar el mismo contenedor que header y resto del portal. Se evaluó UPageHero, que también envuelve UContainer; cambiar de componente no resolvería por sí solo la altura disponible y supondría reescribir innecesariamente el Hero.

### Solución automática, sin listeners de pantalla

La adaptación sigue a cargo del navegador y del sistema responsive de Nuxt UI:

- Márgenes: ancho nativo de UContainer, sin otro max-width local.
- Desktop horizontal: padding-block clamp(1.25rem, 4dvh, 3rem).
- Visual desktop: width min(100%, 80dvh), manteniendo aspect-ratio 4/3 y object-fit:contain. La imagen nunca supera el ancho de su columna; en ventanas bajas reduce su tamaño de forma proporcional.
- Headline desktop: clamp(2.5rem, 3.5vw, 4rem), evitando comprimirlo al recuperar los márgenes nativos.
- Se conserva el breakpoint existente de dos columnas con al menos 1024 px y relación 6:5; square y móvil mantienen su flujo vertical.
- No hay window.innerWidth en código de aplicación, ResizeObserver, listeners de resize, detección de modelo de dispositivo ni estado client-only para posicionar.
- No se impone height:100vh al Hero ni se oculta contenido para simular que cabe. En móviles o ventanas extremas sigue existiendo scroll natural cuando el texto lo necesita.

Las unidades dvh se recalculan al cambiar el viewport. Nuxt mantiene el SSR y Nuxt UI los márgenes; no se atribuye al framework una detección mágica de la altura del contenido.

### Favicon oficial

Se deriva el favicon exclusivamente de public/ajksolutions-official.png, sin redibujar ni recortar la marca:

- public/favicon.ico: cinco tamaños PNG embebidos, 16/32/48/64/256 px, 33,296 bytes.
- public/favicon.png: 64×64 px, 3,842 bytes.
- Se conserva la proporción del logo completo sobre una base blanca para que el texto negro sea legible en pestañas claras u oscuras.
- nuxt.config.ts declara ambos enlaces en app.head.link, con versión ajk-official en la URL para diferenciarlo del favicon anterior almacenado en caché.
- Generador reproducible: node scripts/generate-brand-favicon.mjs.
- Verificación sin escritura: node scripts/generate-brand-favicon.mjs --check.
- Copia recuperable del favicon anterior: logs/hero-fit/previous-favicon.ico.

No cambia el logo de header/footer ni la imagen del ecosistema. No se añade otro logo al Hero normal.

### Archivos de esta corrección

- app/components/PublicHomeHero.vue: solo reglas CSS de contenedor y adaptación fluida.
- nuxt.config.ts: únicamente enlaces de favicon dentro del head.
- public/favicon.ico y public/favicon.png.
- scripts/generate-brand-favicon.mjs y tests/unit/brand-favicon.test.ts.
- scripts/verify-home-hero.mjs: casos fit-before/fit-after, margen frente a header, altura visible, resize sin recargar y favicon.
- tests/e2e/home-hero-viewport.spec.ts: regresiones permanentes de viewport bajo, square/móvil y favicon.
- Evidencias fit-before/fit-after, dos snapshots Home afectados y esta sección.

No se modifican copy, CTA, banners, APIs, seguridad, Prisma, migraciones, dependencias ni runtime/preset de despliegue. La configuración de favicon no altera sesiones o variables de entorno.

### Validación y evidencia

Además de los 16 tamaños anteriores se prueban 1347×636, 1347×502, 1366×600, 1280×600 y 1024×600. El caso 1347×502 cubre una ventana tan baja como la zona visible de la captura; no se afirma que la foto permita conocer todos los parámetros reales del navegador.

Se verifica alineación exacta con UContainer del header y que imagen/CTA terminen dentro del viewport en desktop horizontal. Se redimensiona el mismo documento entre desktop, square y móvil para comprobar que no necesita recarga ni JavaScript propio de layout.

| Caso      | Antes                                             | Después                                            |
| --------- | ------------------------------------------------- | -------------------------------------------------- |
| 1347×636  | [Antes](hero-responsive/fit-before-1347x636.png)  | [Después](hero-responsive/fit-after-1347x636.png)  |
| 1347×502  | No capturado en baseline                          | [Después](hero-responsive/fit-after-1347x502.png)  |
| 1366×600  | [Antes](hero-responsive/fit-before-1366x600.png)  | [Después](hero-responsive/fit-after-1366x600.png)  |
| 390×844   | [Antes](hero-responsive/fit-before-390x844.png)   | [Después](hero-responsive/fit-after-390x844.png)   |
| 1024×1024 | [Antes](hero-responsive/fit-before-1024x1024.png) | [Después](hero-responsive/fit-after-1024x1024.png) |
| 1920×1080 | [Antes](hero-responsive/fit-before-1920x1080.png) | [Después](hero-responsive/fit-after-1920x1080.png) |

Registros: logs/hero-responsive/fit-before.json y fit-after.json. La comprobación de producción terminó correctamente en 21 tamaños distintos (23 muestras), con HTTP 200, sin overflow horizontal, errores de consola ni errores de hidratación. SSR, navegación con teclado y redimensionamiento del mismo documento: PASS. El favicon respondió HTTP 200 con MIME PNG y firma válida.

Resultados concretos: en 1347×636 el contenedor del Hero terminaba en y=751.55 y ahora termina en y=566.47; en 1347×502 termina en y=475.34, dejando visible el contenido completo. En 1920×1080 el contenedor pasa de x=240/ancho=1440 a x=320/ancho=1280, coincidiendo con el header. Las capturas se inspeccionaron en desktop bajo, móvil y square; en móvil se conserva el scroll natural.

QA final: 152 pruebas en 22 archivos PASS; lint/formato/typecheck PASS; build PASS. Se actualizaron exclusivamente los dos snapshots visuales de Inicio (390/1440). Playwright: 5/5 PASS (tres regresiones de viewport/favicon y dos comparaciones visuales), en 1.4 minutos. La base temporal de la prueba se eliminó al finalizar; no se utilizó la base comercial para fixtures.

La primera pasada de Playwright tuvo un timeout de hidratación de 5 segundos durante la compilación inicial del servidor de desarrollo, antes de evaluar geometría. La espera de las dos pruebas que necesitan hidratación se ajustó a 30 segundos; la repetición completa pasó sin cambiar las aserciones de márgenes, altura o favicon. No se atribuye este ajuste del test a una mejora del tiempo de arranque de Nuxt.

### Referencias oficiales de esta corrección

- [Nuxt: introducción y SSR](https://nuxt.com/docs/4.x/getting-started/introduction).
- [Nuxt UI: introducción](https://ui.nuxt.com/docs/getting-started).
- [Nuxt UI Container: ancho y --ui-container](https://ui.nuxt.com/docs/components/container).
- [Nuxt UI PageHero: composición mediante Container](https://ui.nuxt.com/docs/components/page-hero).

Sin despliegue remoto, commit ni push automático. No se inicia Fase 9.
