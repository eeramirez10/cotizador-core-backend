import { Envs } from "./envs";
import type { SystemSettingDefinition, SystemSettingKey } from "../domain/entities/system-setting.entity";

const assistantInfrastructureAvailable = Boolean(
  Envs.twilioWhatsAppEnabled
  && Envs.twilioAccountSid
  && Envs.twilioAuthToken
  && Envs.twilioWhatsAppFrom,
);

export const SYSTEM_SETTING_DEFINITIONS: readonly SystemSettingDefinition[] = [
  {
    key: "QUOTE_INTERNAL_APPROVAL_ENABLED",
    category: "QUOTES",
    label: "Aprobación interna de cotizaciones",
    description: "Solicita autorización de un administrador o gerente antes de cotizar al cliente.",
    type: "BOOLEAN",
    defaultValue: Envs.quoteInternalApprovalEnabled,
    available: true,
    warning: "El cambio aplica a las siguientes acciones; no modifica cotizaciones históricas.",
  },
  {
    key: "SELLER_EXCEL_IMPORT_ENABLED",
    category: "QUOTES",
    label: "Importación del formato del vendedor",
    description: "Permite crear cotizaciones a partir del Excel o PDF elaborado por el vendedor.",
    type: "BOOLEAN",
    defaultValue: Envs.sellerExcelImportEnabled,
    available: true,
  },
  {
    key: "REQUISITION_INTERNAL_APPROVAL_ENABLED",
    category: "PROCUREMENT",
    label: "Aprobación interna de requisiciones",
    description: "Solicita aprobación cuando Compras encuentra una variación de costo.",
    type: "BOOLEAN",
    defaultValue: Envs.requisitionInternalApprovalEnabled,
    available: true,
    warning: "El cambio aplica a las siguientes decisiones de compra.",
  },
  {
    key: "ORDER_FILE_WITHOUT_STOCK_ENABLED",
    category: "PROCUREMENT",
    label: "Generar archivo de pedido sin stock",
    description: "Permite generar el TXT si todas las partidas tienen código ERP, aunque falte stock o la requisición siga pendiente.",
    type: "BOOLEAN",
    defaultValue: false,
    available: true,
    warning: "Los productos locales sin código ERP seguirán bloqueados. Compras deberá gestionar el abastecimiento en Proscai.",
  },
  {
    key: "ORDER_FILE_WITH_LOCAL_CUSTOMER_ENABLED",
    category: "PROCUREMENT",
    label: "Generar archivo de pedido con cliente local",
    description: "Permite generar el TXT de una cotización aprobada aunque el cliente todavía no esté vinculado a Proscai.",
    type: "BOOLEAN",
    defaultValue: false,
    available: true,
    warning: "El TXT no incluye el código del cliente ni lo da de alta en Proscai. El cliente deberá vincularse antes de registrar el pedido en ERP; todas las partidas siguen necesitando código ERP.",
  },
  {
    key: "WHATSAPP_INBOX_ENABLED",
    category: "WHATSAPP",
    label: "Bandeja de WhatsApp",
    description: "Muestra la bandeja y permite consultar las conversaciones autorizadas.",
    type: "BOOLEAN",
    defaultValue: Envs.whatsAppInboxEnabled,
    available: true,
  },
  {
    key: "WHATSAPP_ASSISTANT_ENABLED",
    category: "WHATSAPP",
    label: "Asistente de WhatsApp",
    description: "Permite que la IA responda conversaciones que no están bajo control humano.",
    type: "BOOLEAN",
    defaultValue: Envs.whatsAppAssistantEnabled,
    available: assistantInfrastructureAvailable,
    availabilityMessage: assistantInfrastructureAvailable
      ? undefined
      : "Configura y habilita Twilio WhatsApp en el servidor antes de activar el asistente.",
  },
  {
    key: "WHATSAPP_HUMAN_TAKEOVER_MINUTES",
    category: "WHATSAPP",
    label: "Duración inicial del control humano",
    description: "Tiempo que conserva el vendedor al tomar una conversación.",
    type: "INTEGER",
    defaultValue: Envs.whatsAppHumanTakeoverMinutes,
    min: 5,
    max: 60,
    unit: "minutos",
    available: true,
  },
  {
    key: "WHATSAPP_HUMAN_RESPONSE_GRACE_MINUTES",
    category: "WHATSAPP",
    label: "Gracia para responder al cliente",
    description: "Tiempo disponible después de que el cliente escribe durante el control humano.",
    type: "INTEGER",
    defaultValue: Envs.whatsAppHumanResponseGraceMinutes,
    min: 1,
    max: 30,
    unit: "minutos",
    available: true,
  },
  {
    key: "WHATSAPP_HUMAN_TAKEOVER_MAX_MINUTES",
    category: "WHATSAPP",
    label: "Máximo de control humano",
    description: "Límite total antes de devolver automáticamente la conversación al asistente.",
    type: "INTEGER",
    defaultValue: Envs.whatsAppHumanTakeoverMaxMinutes,
    min: 15,
    max: 240,
    unit: "minutos",
    available: true,
  },
] as const;

export const SYSTEM_SETTING_DEFINITION_BY_KEY = new Map<SystemSettingKey, SystemSettingDefinition>(
  SYSTEM_SETTING_DEFINITIONS.map((definition) => [definition.key, definition]),
);
