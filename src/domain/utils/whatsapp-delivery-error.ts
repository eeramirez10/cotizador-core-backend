const DELIVERY_ERROR_MESSAGES: Record<string, string> = {
  "63016": "No se pudo enviar fuera de la ventana de 24 horas. Verifica que la plantilla de WhatsApp esté aprobada y configurada.",
  "63019": "Twilio no pudo descargar el archivo adjunto. Verifica que la URL pública del PDF corresponda al entorno actual y responda como application/pdf.",
  "63024": "El número destinatario no es válido o no está habilitado para recibir mensajes de WhatsApp.",
};

export const describeWhatsAppDeliveryError = (
  errorCode?: string | number | null,
  providerMessage?: string | null,
): string | null => {
  const code = errorCode === null || errorCode === undefined ? "" : String(errorCode).trim();
  if (code && DELIVERY_ERROR_MESSAGES[code]) return `${DELIVERY_ERROR_MESSAGES[code]} (Twilio ${code})`;

  const detail = providerMessage?.trim();
  if (code && detail) return `Twilio rechazó el envío (${code}): ${detail}`;
  if (code) return `Twilio rechazó el envío con el código ${code}.`;
  return detail || null;
};
