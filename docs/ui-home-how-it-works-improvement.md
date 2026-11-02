# UI/UX de Cómo comprar o solicitar

Revisión: 1 de noviembre de 2026 (America/Guayaquil).

## Implementación

Se convierte la sección de tres pasos en una guía ilustrada, manteniendo el título, los tres mensajes originales y su numeración.

- PublicHomeHowItWorks conserva la lista ordenada y usa encabezados h3 para los pasos.
- Una columna en móvil y tres desde 768 px, con alturas iguales y márgenes nativos de UContainer.
- Bordes de 1.5 rem, sombras suaves, color azul institucional y tipografía coherentes con el Hero y las secciones anteriores.
- Cada paso tiene su propia ilustración 4:3, sin recortar objetos.
- Las tarjetas son informativas; no se añaden botones o acciones inexistentes.
- No se modifican el flujo de compra, las solicitudes, los pagos ni la coordinación posterior.

## Ilustraciones generadas

Se utilizó la herramienta integrada de imagegen para crear tres ilustraciones 3D en azul y blanco, sin logotipos visibles o texto incrustado:

1. Encontrar: equipo genérico, opciones de catálogo y lupa.
2. Registrar: formulario, paquete genérico y bolígrafo.
3. Coordinar: conversación, auriculares y un sobre abstracto.

Son referencias conceptuales del proceso; no se presentan como pantallas reales de la aplicación. No se prometen pagos automáticos ni entregas instantáneas.

Los originales PNG se conservan en la carpeta local de imágenes generadas. Los archivos finales de la aplicación están en public/images/how-it-works, en WebP con calidad 86 y tamaños de 400×300 y 800×600.

| Archivo base          |  400×300 |  800×600 |
| --------------------- | -------: | -------: |
| encuentra-tu-solucion | 11,538 B | 30,144 B |
| registra-tu-solicitud |  7,270 B | 17,158 B |
| coordinamos-contigo   |  7,034 B | 15,434 B |
| Total                 | 25,842 B | 62,736 B |

Los seis archivos suman 88,578 bytes. Se usa srcset estático para no transformar imágenes por visita, con dimensiones explícitas, object-fit:contain, texto alternativo, loading lazy y decoding async.

## Archivos

- app/components/PublicHomeHowItWorks.vue.
- app/pages/index.vue: sustituye únicamente el bloque anterior de la guía.
- public/images/how-it-works/: seis WebP.
- tests/e2e/visual-phase7-5.spec.ts: espera las tres imágenes de la guía además de las cuatro de Respaldo antes de comparar Inicio.
- Dos snapshots de Inicio.
- docs/how-responsive/: medidas y capturas.
- Este informe.

Se conservan los cambios anteriores y las preferencias actuales del usuario. Sin cambios de backend, Prisma, migraciones, dependencias o lógica comercial.

## Validación

Formato global, lint, tipos y build de producción PASS. Vitest: 18 pruebas relacionadas PASS (Hero/campañas, soporte y dominio digital).

Chromium de producción: seis tamaños PASS, con tres imágenes cargadas, texto alternativo, carga diferida, respuestas HTTP correctas, proporción 4:3 y archivos estáticos. Se comprobó la numeración 1/2/3, una/tres columnas, alturas iguales y márgenes del Hero. Sin desbordamiento horizontal, errores de JavaScript/consola ni avisos de hidratación.

Las capturas finales de escritorio y móvil se inspeccionaron visualmente. Playwright: cinco pruebas PASS en 1.5 minutos, incluidas las dos comparaciones visuales de Inicio (390/1440) y tres regresiones de viewport/favicon.

Se actualizaron únicamente los snapshots de Inicio. Las comparaciones esperan las siete imágenes de las secciones Respaldo y Cómo comprar o solicitar antes de capturar. La base temporal utilizada para los fixtures se eliminó al finalizar; no se modificaron los datos comerciales.

La revisión de Chromium cubre 320, 390, 768, 1024, 1440 y 1920 px, tres imágenes cargadas, orden de pasos 1/2/3, una/tres columnas, márgenes del Hero, alturas y ausencia de desbordamiento.

| Pantalla   | Antes                                   | Después                                  |
| ---------- | --------------------------------------- | ---------------------------------------- |
| Escritorio | [Antes](how-responsive/before-1440.png) | [Después](how-responsive/after-1440.png) |
| Móvil      | [Antes](how-responsive/before-390.png)  | [Después](how-responsive/after-390.png)  |

No se realiza commit, push ni despliegue automático.
