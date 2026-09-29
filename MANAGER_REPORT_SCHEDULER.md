# Envio programado de reportes

El worker `manager-report-worker` comparte el generador de PDF y la plantilla Twilio con `Enviar ahora`. La frecuencia decide cuando enviar; `reportRange` decide que fechas incluye el PDF. El envio manual no modifica el calendario.

## Activacion en produccion

1. Respaldar la base de datos y ejecutar `prisma migrate deploy` con la URL de produccion ya verificada. La migracion `20260928120000_add_manager_report_scheduler` solo agrega una columna, un indice y una tabla; no elimina datos.
2. Reconstruir `core-backend` y `manager-report-worker` con el mismo commit.
3. Agregar `MANAGER_REPORT_SCHEDULER_ENABLED=true` al `.env` del core. `TWILIO_WHATSAPP_ENABLED` tambien debe estar activo. Mantener el mismo `PUBLIC_API_URL`, remitente y plantilla de reportes usados por `Enviar ahora`.
4. Levantar `manager-report-worker` con Compose y revisar `manager_report.worker_started`, `manager_report.submitted` y `manager_report.delivery_needs_review` en sus logs.

Para desarrollo local: `MANAGER_REPORT_SCHEDULER_ENABLED=true` en `.env.development` y `pnpm dev:manager-report-worker`, despues de aplicar la migracion a la base de desarrollo.

Las suscripciones anteriores reciben su proximo horario futuro al arrancar el worker. Un horario atrasado mas de 24 horas se marca `SKIPPED`; no se envian reportes historicos en masa. El registro unico `(subscription_id, scheduled_at)` y la actualizacion condicional de `next_run_at` impiden que dos workers reclamen el mismo horario. Si el resultado de Twilio es ambiguo, se marca `NEEDS_REVIEW` y no se reintenta automaticamente para evitar duplicados; revisar Twilio antes de usar `Enviar ahora`. `SUBMITTED` significa que Twilio acepto la solicitud, no que el destinatario la recibio.
