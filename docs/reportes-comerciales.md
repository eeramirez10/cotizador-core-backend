# Reportes comerciales

La página **Reportes** (`/reports`) ofrece bajo demanda el reporte de rendimiento de cotizaciones que se envía por WhatsApp. No representa facturación ni cobranza de Proscai. No envía mensajes al consultar o exportar.

- Administración: todas las sucursales o filtros por sucursal y vendedor.
- Gerencia: únicamente su sucursal y sus vendedores.
- Ventas: únicamente cotizaciones creadas por ese usuario en su sucursal. Los filtros del navegador no pueden ampliar el alcance.
- Las cuentas inactivas y los roles de Compras y Crédito y Cobranza no tienen acceso.

## Opciones

Fechas personalizadas o periodos rápidos, zona horaria, moneda, estado, canal, captura Sistema/Excel y comparación con el periodo inmediatamente anterior de la misma cantidad de días. Se conservan las monedas MXN/USD por separado, sin sumarlas ni convertirlas.

Se incluye resumen, vendedores, sucursales, clientes, estados, canales y detalle paginado con folio y referencia del cliente. PDF autenticado con vista previa, opción de desgloses y detalle completo de las cotizaciones filtradas, independiente de la página visible.

El filtro temporal usa la creación de la cotización, no la fecha de aprobación o factura. Como en el reporte programado, se consolida una versión por familia dentro del periodo; las revisiones del periodo no se suman como ventas distintas. Los importes son totales con impuestos y se leen con el estado vigente al consultar. El porcentaje de aprobación es aprobadas/generadas.

El límite de consulta es 10,000 versiones por periodo/alcance. El PDF detallado admite hasta 1,000 cotizaciones y hasta 3,000 filas de desglose. Los excesos se rechazan con un error explícito, no se omiten filas silenciosamente. Los reportes existentes y su programación no cambian; el selector de estados se aplica después de consolidar las revisiones en la consulta manual.

## Endpoints

- `GET /api/reports/options`
- `GET /api/reports/quotes`
- `GET /api/reports/quotes/pdf`

Los tres usan autenticación y permisos del core. No requieren variables, migraciones ni cambios en IA Platform o el backend ERP. Para staging: actualizar core y después frontend, siguiendo development → staging. No hace falta reinicializar datos ni cambiar suscripciones.

Las cotizaciones archivadas siguen incluidas igual que en el reporte programado actual; archivar no equivale a cancelar ni eliminar actividad histórica.
