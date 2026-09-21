import type { SystemSettingKey, SystemSettingRecord, SystemSettingValue } from "../entities/system-setting.entity";

export abstract class SystemSettingRepository {
  abstract list(): Promise<SystemSettingRecord[]>;
  abstract upsertMany(input: {
    settings: Array<{ key: SystemSettingKey; value: SystemSettingValue }>;
    actorUserId: string;
  }): Promise<void>;
  abstract resetMany(input: {
    keys: SystemSettingKey[];
    actorUserId: string;
  }): Promise<void>;
}
