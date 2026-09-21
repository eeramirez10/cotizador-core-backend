import type { SystemSettingKey, SystemSettingRecord, SystemSettingValue } from "../entities/system-setting.entity";

export abstract class SystemSettingsRuntime {
  abstract refresh(force?: boolean): Promise<void>;
  abstract value(key: SystemSettingKey): SystemSettingValue;
  abstract boolean(key: SystemSettingKey): boolean;
  abstract number(key: SystemSettingKey): number;
  abstract record(key: SystemSettingKey): SystemSettingRecord | undefined;
}
