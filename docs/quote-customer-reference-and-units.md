# Referencia del cliente y unidades locales

- La referencia opcional pertenece a cada version de la cotizacion. Se limita a
  120 caracteres, se copia al crear una revision y se muestra en los PDF de la
  cotizacion generados por el frontend. Omitirla al editar conserva el valor;
  enviar null o texto vacio lo borra. No se cambia el formato de importacion ERP.
- Las extracciones de solicitudes de cliente devuelven customer_reference.
  El editor la sugiere sin sobrescribir una referencia diferente. No se agregan
  campos a las extracciones de proveedores ni al importador de cotizacion Excel.
- En Catalogos > Unidades de medida, ADMIN administra codigos globales e
  inmutables. TON es la tonelada local y no realiza conversiones ni mapea
  automaticamente a Proscai. Desactivar una opcion no cambia registros previos.

## Orden de entrega

Validar e integrar mediante development y staging. En staging, aplicar primero
las migraciones aditivas del core con Prisma migrate deploy. Son dos migraciones
porque PostgreSQL debe confirmar la adicion del enum antes de usar su valor en
el indice y en los datos iniciales. No requieren seed, reset ni variables nuevas.

Actualizar core y los procesos de IA (API y worker) de staging antes del frontend.
No hay cambios de esquema en IA ni cambios en tuvansa-backend-ca. La API de IA
incluye la version del contrato de extraccion en su clave de idempotencia para
no reutilizar resultados previos que no tengan referencia.

Probar una solicitud controlada con referencia y partidas en TON, crear un
borrador, revisar el PDF en los dos estilos y enviarlo solo a un numero
autorizado de staging. Verificar que se conserva al generar una revision y que
una unidad desactivada sigue visible en productos que la usan.
