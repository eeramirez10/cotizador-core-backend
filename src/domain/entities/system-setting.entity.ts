export const SYSTEM_SETTING_KEYS = [
  "QUOTE_INTERNAL_APPROVAL_ENABLED",
  "REQUISITION_INTERNAL_APPROVAL_ENABLED",
  "ORDER_FILE_WITHOUT_STOCK_ENABLED",
  "ORDER_FILE_WITH_LOCAL_CUSTOMER_ENABLED",
  "SELLER_EXCEL_IMPORT_ENABLED",
  "WHATSAPP_INBOX_ENABLED",
  "WHATSAPP_ASSISTANT_ENABLED",
  "WHATSAPP_HUMAN_TAKEOVER_MINUTES",
  "WHATSAPP_HUMAN_RESPONSE_GRACE_MINUTES",
  "WHATSAPP_HUMAN_TAKEOVER_MAX_MINUTES",
] as const;

export type SystemSettingKey = typeof SYSTEM_SETTING_KEYS[number];
export type SystemSettingValue = boolean | number;
export type SystemSettingCategory = "QUOTES" | "PROCUREMENT" | "WHATSAPP";
export type SystemSettingValueType = "BOOLEAN" | "INTEGER";

export interface SystemSettingRecord {
  key: SystemSettingKey;
  value: SystemSettingValue;
  updatedByUserId: string | null;
  updatedAt: Date;
}

export interface SystemSettingDefinition {
  key: SystemSettingKey;
  category: SystemSettingCategory;
  label: string;
  description: string;
  type: SystemSettingValueType;
  defaultValue: SystemSettingValue;
  min?: number;
  max?: number;
  unit?: string;
  available: boolean;
  availabilityMessage?: string;
  warning?: string;
}

export interface ManagedSystemSetting extends SystemSettingDefinition {
  value: SystemSettingValue;
  overridden: boolean;
  updatedAt: Date | null;
}
