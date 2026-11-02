# UI/UX de Respaldo AJKSolutionS

Revisión: 1 de noviembre de 2026 (America/Guayaquil).

## Implementación

Se mejora “Respaldo AJKSolutionS” siguiendo la paleta, los márgenes, la tipografía, los bordes y las sombras del Hero y las secciones anteriores.

- PublicHomeBacking reúne cuatro tarjetas informativas con una imagen por subtema.
- Cuatro columnas desde 1024 px, dos desde 640 px y una en móvil.
- Se mantienen íntegros los cuatro títulos y textos anteriores.
- UContainer conserva el ancho nativo del portal.
- Imágenes 4:3 completas con object-fit:contain, dimensiones explícitas, texto alternativo, decoding async y loading lazy.
- Se utilizan srcset estáticos de 400 y 800 px para evitar transformaciones de imagen por cada visita.
- Las tarjetas no simulan ser botones ni añaden destinos nuevos.

## Imágenes creadas

Se usó la habilidad imagegen y la herramienta integrada para crear cuatro ilustraciones 3D en azul y blanco, sin logotipos visibles, pantallas de sistemas conocidos ni emblemas de aplicaciones.

1. Asesoría especializada: equipo genérico, conversación y revisión de opciones.
2. Garantía informada: documento de condiciones, lupa y escudo genérico; no se presenta como certificación oficial ni garantía incondicional.
3. Soporte técnico: circuito y herramientas de precisión genéricos.
4. Atención directa: auriculares, dispositivo y conversación; se retiró el recorte de cámara distintivo para mantener una apariencia genérica.

Las ilustraciones son conceptuales. No se presentan como fotografías del personal, instalaciones o productos vendidos. Los originales PNG permanecen en la carpeta local de imágenes generadas; los assets finales usados por la aplicación están en public/images/backing.

| Archivo base           |  400×300 |   800×600 |
| ---------------------- | -------: | --------: |
| asesoria-especializada | 11,360 B |  30,232 B |
| garantia-informada     |  7,340 B |  18,486 B |
| soporte-tecnico        | 17,034 B |  49,204 B |
| atencion-directa       | 10,226 B |  26,230 B |
| Total                  | 45,960 B | 124,152 B |

Todos los archivos son WebP, calidad 86. El conjunto de ocho archivos ocupa 170,112 bytes. Se conservó la proporción 4:3 de los originales, sin recortar los objetos.

## Archivos

- app/components/PublicHomeBacking.vue.
- app/pages/index.vue: sustituye exclusivamente el bloque de Respaldo y mueve sus datos al componente.
- public/images/backing/: ocho imágenes WebP.
- docs/backing-responsive/: capturas y mediciones antes/después.
- Dos snapshots de Inicio afectados por esta sección.
- tests/e2e/visual-phase7-5.spec.ts: la captura de Inicio espera las cuatro imágenes de carga diferida antes de comparar.
- Este informe.

Se conservan el Hero, las preferencias actuales en Soluciones, Soporte, Licencias digitales y la corrección anterior del filtro DIGITAL. Sin cambios de backend, Prisma, migraciones, dependencias o lógica comercial.

## Validación

Lint y tipos PASS. Vitest: 18 regresiones relacionadas PASS (Hero/campañas, soporte y dominio digital). La comprobación de tipos se repitió tras ampliar la prueba visual.

Chromium de producción: seis tamaños PASS, cuatro imágenes cargadas con respuesta HTTP correcta, textos alternativos, carga diferida, archivos estáticos y proporción 4:3. Se verificaron márgenes nativos, una/dos/cuatro columnas y alturas iguales de las tarjetas en escritorio. Sin desbordamiento horizontal, errores JavaScript/consola ni avisos de hidratación.

Las capturas finales de 390 y 1440 px se inspeccionaron visualmente. Formato global PASS. Playwright: cinco pruebas PASS en 1.3 minutos, incluidas las dos comparaciones de Inicio (390/1440) y las tres regresiones de viewport/favicon. Se actualizaron únicamente los snapshots de Inicio.

La base temporal usada para los fixtures se eliminó al finalizar, sin modificar los datos comerciales. Compilación final: pnpm build PASS con código de salida 0; registro en logs/backing-build-final.log.

En la primera pasada visual móvil, la espera global de cinco segundos expiró con tres solicitudes de imágenes pendientes. La traza mostraba la primera imagen con HTTP 200 y no mostraba respuestas 404. Se ajustó la prueba para entrar en pantalla y esperar cada imagen individualmente, hasta 30 segundos, conservando la aserción de imagen completa y naturalWidth mayor que cero. No se cambió el comportamiento de la aplicación para resolver este caso del entorno de desarrollo.

Se verifica en 320, 390, 768, 1024, 1440 y 1920 px: cuatro imágenes cargadas, sin desbordamiento, alineación con el Hero, alturas de tarjetas y conservación de proporción, carga diferida y selección de archivos estáticos.

| Pantalla   | Antes                                       | Después                                      |
| ---------- | ------------------------------------------- | -------------------------------------------- |
| Escritorio | [Antes](backing-responsive/before-1440.png) | [Después](backing-responsive/after-1440.png) |
| Móvil      | [Antes](backing-responsive/before-390.png)  | [Después](backing-responsive/after-390.png)  |

No se realiza commit, push ni despliegue automático.
