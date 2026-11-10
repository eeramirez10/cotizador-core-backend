# Inventario ERP de solo consulta

Rutas del core, con Bearer token y usuario activo, para todos los roles actuales:

- `GET /api/inventory/erp`
- `GET /api/inventory/erp/warehouses`

Usan el backend ERP configurado con `ERP_API_URL`, `ERP_PRODUCTS_BASE_PATH`,
`ERP_INTERNAL_API_KEY` y `ERP_API_TIMEOUT_MS`. No hay nuevas variables,
migraciones ni escrituras en Proscai. La clave interna nunca llega al navegador.

Inventario acepta `query`, `warehouseCode`, `stock`, `page`, `pageSize`, `sortBy`
y `sortDirection`. Ver el contrato en `erp-inventory-query.dto.ts`. La respuesta
incluye items paginados, total, totalPages y `fetchedAt` (hora de consulta, no
fecha de movimiento ERP). A los campos internos se agrega `warehouseName`.
Solo se propagan campos de una lista permitida, sin informacion financiera.
La busqueda se normaliza con NFC, trim y mayusculas. Los codigos de almacenes
admiten de 1 a 6 caracteres de texto, sin controles, segun ALMNUM. No se rechaza
una lista valida por contener ANOID o |. Los numericos conservan el relleno
minimo de dos digitos; los demas no se rellenan ni cambian de mayusculas.

El listado de almacenes combina codigos reales de FALM con nombres del catalogo
existente, incluidos inactivos. Los desconocidos se muestran como `Almacen XX`
(con acento en la interfaz), nunca se ocultan ni se infieren por el codigo del
producto. Sin FALM: nombre `Sin registro de almacen`, codigo y existencia null.

La consulta es global. No usa las asignaciones de cotizacion ni cambia sus
permisos. Administracion de almacenes sigue restringida a ADMIN.
Validacion invalida: 400; sin sesion/usuario inactivo: 401; fallo ERP: 502;
timeout: 504. No se devuelven SQL ni credenciales en los errores.

Verificacion: `pnpm test`, `pnpm exec tsc --noEmit`. Los tests de inventario
simulan HTTP, el catalogo y autenticacion, sin bases reales. Algunos tests
existentes de despliegue generan shebangs con `process.execPath`: requieren
ejecutar Node desde una ruta sin espacios.

Entrega independiente en core, backend ERP y frontend, pasando por development
y staging antes de main. No publicar/desplegar sin autorizacion. Actualizar el
backend ERP y el core antes de publicar el frontend.
