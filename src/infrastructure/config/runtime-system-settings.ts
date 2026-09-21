import type { SystemSettingKey, SystemSettingRecord, SystemSettingValue } from "../../domain/entities/system-setting.entity";
import { SYSTEM_SETTING_DEFINITION_BY_KEY } from "../../config/system-settings.registry";
import { PrismaSystemSettingRepository } from "../repositories/prisma-system-setting.repository";
import { SystemSettingsRuntime } from "../../domain/services/system-settings-runtime";

const CACHE_TTL_MS = 10_000;

class RuntimeSystemSettings extends SystemSettingsRuntime {
  private readonly repository = new PrismaSystemSettingRepository();
  private overrides = new Map<SystemSettingKey, SystemSettingRecord>();
  private refreshedAt = 0;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    super();
  }

  async refresh(force = false): Promise<void> {
    if (!force && Date.now() - this.refreshedAt < CACHE_TTL_MS) return;
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.repository.list()
      .then((rows) => {
        this.overrides = new Map(rows.map((row) => [row.key, row]));
        this.refreshedAt = Date.now();
      })
      .finally(() => {
        this.refreshPromise = null;
      });
    return this.refreshPromise;
  }

  value(key: SystemSettingKey): SystemSettingValue {
    const definition = SYSTEM_SETTING_DEFINITION_BY_KEY.get(key)!;
    if (!definition.available && definition.type === "BOOLEAN") return false;
    return this.overrides.get(key)?.value ?? definition.defaultValue;
  }

  boolean(key: SystemSettingKey): boolean {
    return this.value(key) === true;
  }

  number(key: SystemSettingKey): number {
    const value = this.value(key);
    return typeof value === "number" ? value : Number(value);
  }

  record(key: SystemSettingKey): SystemSettingRecord | undefined {
    return this.overrides.get(key);
  }
}

export const runtimeSystemSettings = new RuntimeSystemSettings();
