import { SYSTEM_SETTING_KEYS, type SystemSettingKey } from "../../entities/system-setting.entity";

export class ResetSystemSettingsRequestDto {
  private constructor(public readonly keys: SystemSettingKey[]) {}

  static create(input: unknown): [string?, ResetSystemSettingsRequestDto?] {
    const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
    if (!Array.isArray(body.keys) || body.keys.length === 0) return ["keys must contain at least one configuration."];
    const keys = [...new Set(body.keys.map((value) => String(value).trim()))] as SystemSettingKey[];
    if (keys.some((key) => !SYSTEM_SETTING_KEYS.includes(key))) return ["One or more configuration keys are invalid."];
    return [, new ResetSystemSettingsRequestDto(keys)];
  }
}
