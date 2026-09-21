import { SYSTEM_SETTING_DEFINITION_BY_KEY } from "../../../config/system-settings.registry";
import { SYSTEM_SETTING_KEYS, type SystemSettingKey, type SystemSettingValue } from "../../entities/system-setting.entity";

export class UpdateSystemSettingsRequestDto {
  private constructor(
    public readonly settings: Array<{ key: SystemSettingKey; value: SystemSettingValue }>,
  ) {}

  static create(input: unknown): [string?, UpdateSystemSettingsRequestDto?] {
    const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
    if (!Array.isArray(body.settings) || body.settings.length === 0) {
      return ["settings must contain at least one configuration."];
    }
    const seen = new Set<string>();
    const settings: Array<{ key: SystemSettingKey; value: SystemSettingValue }> = [];
    for (const item of body.settings) {
      if (!item || typeof item !== "object") return ["Each setting must be an object."];
      const row = item as Record<string, unknown>;
      const key = String(row.key || "").trim() as SystemSettingKey;
      if (!SYSTEM_SETTING_KEYS.includes(key)) return [`Unknown setting: ${key || "empty"}.`];
      if (seen.has(key)) return [`Setting ${key} is duplicated.`];
      seen.add(key);
      const definition = SYSTEM_SETTING_DEFINITION_BY_KEY.get(key)!;
      const value = row.value;
      if (definition.type === "BOOLEAN" && typeof value !== "boolean") {
        return [`${key} must be boolean.`];
      }
      if (definition.type === "INTEGER" && (!Number.isInteger(value) || typeof value !== "number")) {
        return [`${key} must be an integer.`];
      }
      if (typeof value === "number" && definition.min !== undefined && value < definition.min) {
        return [`${key} must be greater than or equal to ${definition.min}.`];
      }
      if (typeof value === "number" && definition.max !== undefined && value > definition.max) {
        return [`${key} must be less than or equal to ${definition.max}.`];
      }
      if (!definition.available && value === true) {
        return [definition.availabilityMessage || `${key} is not available.`];
      }
      settings.push({ key, value: value as SystemSettingValue });
    }
    return [, new UpdateSystemSettingsRequestDto(settings)];
  }
}
