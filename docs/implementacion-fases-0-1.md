# Implementación de las Fases 0 y 1

**Proyecto:** AjkSolutionS eCommerce  
**Versión de la base:** 0.1.0  
**Fecha de implementación:** 28 de agosto de 2026  
**Fecha de auditoría técnica:** 29 de agosto de 2026  
**Estado:** implementado, corregido y verificado contra la instalación local de PostgreSQL

## 1. Propósito

Este documento describe la implementación realizada durante las Fases 0 y 1 de AjkSolutionS eCommerce. El objetivo de estas fases es establecer una base técnica reproducible, segura y extensible antes de incorporar catálogo, carrito, checkout, pagos, inventario y demás módulos comerciales.

La entrega comprende infraestructura de desarrollo, convenciones de calidad, persistencia inicial, autenticación administrativa, autorización basada en roles y permisos, auditoría, configuración general y los primeros shells visuales de la aplicación pública y administrativa.

## 2. Alcance implementado

### Fase 0 — Fundación técnica

- Proyecto Nuxt 4 con Vue 3, TypeScript estricto y renderizado SSR.
- Gestión de dependencias con pnpm y versiones fijadas.
- Nuxt UI, Nuxt Image, Nuxt Icon y Pinia.
- Backend integrado mediante rutas de servidor Nitro.
- Integración con una instancia local de PostgreSQL 18.6.
- Prisma ORM, adaptador PostgreSQL y migración inicial versionada.
- Configuración mediante variables de entorno y archivo `.env.example`.
- ESLint, Prettier, Vitest, Playwright y TypeScript como controles de calidad.
- Flujo de integración continua con GitHub Actions.
- Renovate para mantenimiento futuro de dependencias.
- Repositorio Git inicializado sobre la rama `main`.

### Fase 1 — Seguridad y administración base

- Usuarios administrativos con activación y borrado lógico.
- Hash de contraseñas con Argon2id.
- Login, logout y consulta de sesión.
- Sesiones cifradas mediante `nuxt-auth-utils`.
- Cookies `httpOnly`, `sameSite=lax` y `secure` en producción.
- Rate limit de login por dirección IP.
- Roles, permisos y relaciones RBAC.
- Guards de permisos en endpoints de servidor.
- Revalidación de usuario, estado, roles y permisos contra PostgreSQL en cada endpoint protegido.
- Auditoría de accesos y eventos de autenticación.
- Configuración inicial de negocio para Ecuador y moneda USD.
- Seed idempotente para roles, permisos, configuración y superadministrador.
- Pantalla de acceso y shell inicial del panel administrativo.
- Portal público y páginas placeholder para las fases posteriores.

## 3. Stack tecnológico

| Componente         | Tecnología                             |
| ------------------ | -------------------------------------- |
| Runtime            | Node.js 24 o superior                  |
| Gestor de paquetes | pnpm 11.24.0                           |
| Framework          | Nuxt 4.5.2 y Vue 3                     |
| Lenguaje           | TypeScript 5.9.3 en modo estricto      |
| UI                 | Nuxt UI 4.11.0                         |
| Estado             | Pinia 3.0.3                            |
| API                | Nitro server routes                    |
| Base de datos      | PostgreSQL 18.6                        |
| ORM                | Prisma 7.10.0 con `@prisma/adapter-pg` |
| Validación         | Zod 4.4.3                              |
| Contraseñas        | Argon2id                               |
| Sesiones           | `nuxt-auth-utils`                      |
| Pruebas            | Vitest y Playwright                    |
| Calidad            | ESLint y Prettier                      |

Prisma 7.10.0 fue seleccionado porque Prisma 8 solo se encontraba disponible como release candidate durante la implementación. La decisión y las compatibilidades asociadas están registradas en `docs/technical-decisions.md`.

## 4. Organización del código

```text
app/
  assets/                 Estilos globales
  components/             Componentes reutilizables
  layouts/                Layout público y administrativo
  middleware/             Protección de navegación administrativa
  pages/                  Portal, login y vistas iniciales
server/
  api/                    Endpoints Nitro
  repositories/           Acceso a datos
  services/               Autenticación y auditoría
  utils/                  Prisma, RBAC, errores y rate limit
shared/
  constants/              Roles y permisos
  schemas/                Validaciones Zod
  types/                  Contratos compartidos
prisma/
  migrations/             Migración SQL inicial
  schema.prisma           Modelo de persistencia
  seed.ts                 Datos iniciales idempotentes
tests/
  unit/                   Pruebas de esquemas
  integration/            Contratos de endpoints
  e2e/                    Flujo de login administrativo
docs/                     Documentación y decisiones técnicas
```

La separación evita que las páginas accedan directamente a Prisma. Los endpoints delegan los casos de uso a servicios, y los servicios utilizan repositorios para consultar o modificar datos.

## 5. Modelo de datos

La migración inicial crea las siguientes entidades:

| Entidad            | Responsabilidad                                    |
| ------------------ | -------------------------------------------------- |
| `users`            | Identidad, credenciales, estado y fechas de acceso |
| `roles`            | Perfiles funcionales del sistema                   |
| `permissions`      | Capacidades autorizables                           |
| `user_roles`       | Relación muchos a muchos entre usuarios y roles    |
| `role_permissions` | Relación muchos a muchos entre roles y permisos    |
| `audit_logs`       | Historial de acciones, contexto HTTP y cambios     |
| `settings`         | Configuración general categorizada                 |

Se incorporaron claves únicas para email, códigos de roles, códigos de permisos y claves de configuración. También se agregaron índices para estado de usuarios, relaciones RBAC y consultas frecuentes de auditoría.

## 6. Seed y configuración inicial

El comando `pnpm db:seed` ejecuta un proceso idempotente; puede repetirse sin duplicar información. Además de crear o actualizar los registros, elimina asignaciones de permisos obsoletas de los roles gestionados por el seed, por lo que la matriz declarada en código queda sincronizada exactamente. La contraseña inicial debe tener al menos doce caracteres. El proceso crea o actualiza:

- Roles `SUPER_ADMIN`, `ADMIN`, `SALES` y `SUPPORT`.
- Permisos de dashboard, catálogo, clientes, pedidos, tickets, licencias, configuración, seguridad y auditoría.
- Asignaciones de permisos por rol.
- Usuario superadministrador definido con variables `SEED_ADMIN_*`.
- Configuraciones `business.name`, `currency=USD` y `country=EC`.

Las contraseñas nunca se almacenan en texto plano. El seed genera un hash Argon2id antes de persistir el administrador.

## 7. Autenticación y sesiones

El flujo de autenticación se implementó de la siguiente manera:

1. El formulario valida email y contraseña con Zod.
2. `POST /api/auth/login` aplica el límite de intentos por IP.
3. El servicio busca únicamente usuarios activos y no eliminados.
4. La contraseña se verifica con Argon2id.
5. Se obtienen los roles y permisos efectivos del usuario.
6. Se registra el acceso exitoso en auditoría.
7. Se crea una sesión cifrada con duración máxima de ocho horas.
8. El cliente actualiza su sesión y redirige al panel administrativo.

Para reducir diferencias temporales que faciliten la enumeración de usuarios, cuando el email no existe también se realiza trabajo criptográfico Argon2. Los mensajes de error no revelan si falló el usuario o la contraseña.

El límite inicial permite ocho intentos durante una ventana de quince minutos por IP. Su almacenamiento es local en memoria y debe migrarse a Redis antes de desplegar múltiples instancias.

Los endpoints de autenticación envían `Cache-Control: no-store`. En el logout, la sesión se destruye incluso si el registro de auditoría falla, evitando que una incidencia secundaria deje una sesión abierta.

## 8. Autorización RBAC

Los permisos iniciales son:

```text
dashboard.view
catalog.manage
customers.manage
orders.manage
tickets.manage
licenses.manage
settings.manage
security.manage
audit.view
```

La autorización real ocurre en el servidor mediante `requirePermission`. Un usuario `SUPER_ADMIN` supera cualquier verificación; los demás usuarios deben poseer el permiso solicitado a través de alguno de sus roles. El guard vuelve a consultar al usuario activo y sus asignaciones en PostgreSQL antes de autorizar. Si el usuario fue desactivado o eliminado lógicamente, destruye la sesión; si cambiaron sus roles o permisos, actualiza los claims de sesión. Así, una revocación no permanece vigente durante las ocho horas de vida de la cookie.

El middleware de Nuxt impide la navegación casual hacia `/admin` sin sesión, pero no sustituye los guards del servidor. Toda operación administrativa sensible debe usar autorización en su endpoint.

## 9. Auditoría

El modelo `AuditLog` permite almacenar:

- Usuario relacionado, cuando existe.
- Acción ejecutada.
- Tipo e identificador de entidad.
- Valores anteriores y nuevos en formato JSON.
- Dirección IP y agente de usuario.
- Fecha de creación.

La Fase 1 registra accesos exitosos, intentos fallidos y cierre de sesión. Los módulos futuros deberán reutilizar el servicio de auditoría en las operaciones administrativas relevantes.

## 10. Endpoints disponibles

| Método | Ruta                   | Función                                    |
| ------ | ---------------------- | ------------------------------------------ |
| `POST` | `/api/auth/login`      | Autenticar y crear sesión                  |
| `POST` | `/api/auth/logout`     | Auditar y destruir sesión                  |
| `GET`  | `/api/auth/session`    | Consultar el usuario autenticado           |
| `GET`  | `/api/health`          | Verificar aplicación y conexión PostgreSQL |
| `GET`  | `/api/admin/dashboard` | Ejemplo de endpoint protegido por permiso  |

Las respuestas de error se normalizan con código HTTP, código interno y mensaje apto para consumo del frontend.

## 11. Interfaz implementada

El portal público incluye navegación principal y páginas iniciales para productos, servicios y licencias. Estas vistas actúan como cascarón visual y no representan un catálogo funcional.

El módulo administrativo incorpora:

- Login responsive.
- Redirección segura después del acceso.
- Layout administrativo.
- Dashboard inicial.
- Protección global de rutas `/admin`.
- Vistas placeholder para módulos todavía no implementados.

## 12. Variables de entorno

Antes de iniciar el proyecto se debe copiar `.env.example` a `.env`. Como mínimo deben configurarse:

```dotenv
POSTGRES_DB=ajksolutions_ecommerce
POSTGRES_USER=ajksolutions
POSTGRES_PASSWORD=<contraseña-local>
DATABASE_URL=postgresql://ajksolutions:<contraseña-local>@localhost:5432/ajksolutions_ecommerce?schema=public
NUXT_SESSION_PASSWORD=<secreto-de-32-caracteres-o-más>
NUXT_PUBLIC_APP_URL=http://localhost:3000
SEED_ADMIN_EMAIL=<email-administrador>
SEED_ADMIN_PASSWORD=<contraseña-segura>
SEED_ADMIN_FIRST_NAME=<nombre>
SEED_ADMIN_LAST_NAME=<apellido>
```

El archivo `.env` está excluido de Git. No deben versionarse contraseñas, credenciales de servicios externos ni secretos de sesión.

## 13. Ejecución local

Requisitos:

- Node.js 24 o superior.
- pnpm 11 o superior.
- PostgreSQL instalado y con el servicio activo.
- Una base de datos vacía, por ejemplo `ajksolutions_ecommerce`.

```powershell
pnpm install
Copy-Item .env.example .env
pnpm db:deploy
pnpm db:seed
pnpm dev
```

Direcciones locales:

- Portal: `http://localhost:3000`
- Login administrativo: `http://localhost:3000/admin/login`
- Health check: `http://localhost:3000/api/health`

## 14. Controles de calidad

La implementación fue comprobada mediante:

```powershell
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Resultados de la entrega:

- ESLint aprobado.
- Prettier aprobado.
- TypeScript estricto aprobado.
- Cuatro pruebas Vitest aprobadas: dos unitarias y dos de integración real con PostgreSQL.
- Tres pruebas Playwright aprobadas: pantalla de acceso, health con base conectada y ciclo de sesión login/dashboard/logout.
- Build de cliente, servidor SSR y Nitro aprobado.
- Artefacto de producción iniciado correctamente en Windows.
- `/admin/login` verificado con respuesta HTTP 200.
- `/api/auth/session` verificado con respuesta HTTP 200 y usuario anónimo.

La aplicación utiliza directamente el servicio PostgreSQL de la máquina. `DATABASE_URL` debe contener las credenciales y el puerto correctos de esa instalación antes de aplicar migraciones o ejecutar el seed.

## 15. Integración continua

El workflow `.github/workflows/ci.yml` se ejecuta para cambios en `main` y pull requests. Instala dependencias con lockfile congelado y valida:

1. Lint.
2. Formato.
3. Tipos.
4. Pruebas.
5. Build de producción.

El runner prepara su PostgreSQL preinstalado, aplica la migración y ejecuta el seed antes de las pruebas. Este flujo tampoco requiere Docker.

## 16. Decisiones y limitaciones conocidas

- Se usa Prisma 7.10.0 estable hasta disponer de una versión estable y compatible de Prisma 8.
- El typecheck se ejecuta como gate separado del bundle por un problema de parsing de rutas Windows en `vite-plugin-checker`.
- Se usa `prisma-client-js` para evitar que Nitro reescriba incorrectamente `import.meta.url` del cliente Prisma local en Windows.
- El rate limit de autenticación es válido para una sola instancia.
- Las IP obtenidas desde `X-Forwarded-For` solo deben aceptarse detrás de un proxy de confianza que reemplace ese encabezado.
- El build de Nuxt Image generado en Windows incluye binarios `sharp` para `win32-x64`; el build de producción debe ejecutarse en la misma arquitectura del despliegue o dentro de su imagen de construcción.

## 17. Auditoría de cierre por criterio

| Criterio                            | Evidencia principal                                                              | Resultado |
| ----------------------------------- | -------------------------------------------------------------------------------- | --------- |
| Nuxt SSR y estructura de aplicación | `nuxt.config.ts`, `app/app.vue`, layouts y páginas                               | Conforme  |
| TypeScript estricto                 | `nuxt.config.ts`, `tsconfig.json`, `pnpm typecheck`                              | Conforme  |
| PostgreSQL sin Docker               | `.env.example`, Prisma adapter y health real                                     | Conforme  |
| Esquema versionado                  | `prisma/schema.prisma` y migración inicial                                       | Conforme  |
| Seed repetible                      | `prisma/seed.ts`, ejecución consecutiva sin duplicados                           | Conforme  |
| Contraseñas seguras                 | Argon2id y validación mínima del secreto inicial                                 | Conforme  |
| Sesiones seguras                    | Cookie cifrada, `httpOnly`, `sameSite`, `secure` en producción y `no-store`      | Conforme  |
| RBAC efectivo                       | Matriz de permisos, guard de servidor y revalidación contra la base              | Conforme  |
| Revocación de acceso                | Invalidación de sesión para usuario inactivo/eliminado y actualización de claims | Conforme  |
| Auditoría                           | Eventos `LOGIN_SUCCESS`, `LOGIN_FAILED` y `LOGOUT` persistidos                   | Conforme  |
| Calidad automatizada                | ESLint, Prettier, typecheck, Vitest, Playwright y build                          | Conforme  |
| Integración continua                | GitHub Actions con PostgreSQL instalado en runner, migrate, seed y gates         | Conforme  |

Durante la auditoría se corrigieron cuatro desviaciones: la prueba de health que antes era estática se reemplazó por consultas reales; el RBAC dejó de confiar únicamente en claims antiguos; el logout ahora elimina la sesión aun si falla la auditoría; y Playwright quedó fijado a `127.0.0.1:3000` con un tiempo de arranque apropiado para Windows.

## 18. Fuera de alcance

Las siguientes capacidades pertenecen a fases posteriores:

- Catálogo y gestión real de productos.
- Inventario y movimientos de stock.
- Clientes y direcciones.
- Carrito y checkout.
- Pedidos y estados comerciales.
- Pagos e integraciones bancarias.
- Facturación electrónica.
- Tickets y soporte funcional.
- Gestión completa de licencias.
- Notificaciones y mensajería.
- Integraciones con R2, Sentry, WhatsApp u otros proveedores.

## 19. Criterio de cierre

Las Fases 0 y 1 se consideran implementadas porque la aplicación cuenta con una base compilable, controles automatizados, estructura de persistencia versionada, configuración reproducible, autenticación segura, sesiones, RBAC, auditoría y shells de UI preparados para extenderse.

La validación operativa se completó sobre PostgreSQL local: se creó `ajksolutions_ecommerce`, se aplicó `pnpm db:deploy`, se ejecutó `pnpm db:seed` y `/api/health` respondió con `database: connected`.
