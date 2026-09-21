import { SYSTEM_SETTING_DEFINITIONS } from "../../config/system-settings.registry";
import type { UpdateSystemSettingsRequestDto } from "../dtos/request/update-system-settings-request.dto";
import type { ManagedSystemSetting, SystemSettingKey, SystemSettingValue } from "../entities/system-setting.entity";
import type { SystemSettingRepository } from "../repositories/system-setting.repository";
import type { SystemSettingsRuntime } from "../services/system-settings-runtime";

export class ManageSystemSettingsUseCase {
  constructor(
    private readonly repository: SystemSettingRepository,
    private readonly runtime: SystemSettingsRuntime,
  ) {}

  async list(): Promise<ManagedSystemSetting[]> {
    await this.runtime.refresh();
    return SYSTEM_SETTING_DEFINITIONS.map((definition) => {
      const record = this.runtime.record(definition.key);
      return {
        ...definition,
        value: this.runtime.value(definition.key),
        overridden: Boolean(record),
        updatedAt: record?.updatedAt ?? null,
      };
    });
  }

  async update(dto: UpdateSystemSettingsRequestDto, actorUserId: string): Promise<ManagedSystemSetting[]> {
    await this.runtime.refresh();
    const proposed = new Map<SystemSettingKey, SystemSettingValue>(
      SYSTEM_SETTING_DEFINITIONS.map((definition) => [definition.key, this.runtime.value(definition.key)]),
    );
    dto.settings.forEach((setting) => proposed.set(setting.key, setting.value));
    this.validateRelationships(proposed);
    await this.repository.upsertMany({ settings: dto.settings, actorUserId });
    await this.runtime.refresh(true);
    return this.list();
  }

  async reset(keys: SystemSettingKey[], actorUserId: string): Promise<ManagedSystemSetting[]> {
    await this.repository.resetMany({ keys, actorUserId });
    await this.runtime.refresh(true);
    return this.list();
  }

  private validateRelationships(values: Map<SystemSettingKey, SystemSettingValue>): void {
    const takeover = Number(values.get("WHATSAPP_HUMAN_TAKEOVER_MINUTES"));
    const grace = Number(values.get("WHATSAPP_HUMAN_RESPONSE_GRACE_MINUTES"));
    const maximum = Number(values.get("WHATSAPP_HUMAN_TAKEOVER_MAX_MINUTES"));
    if (takeover > maximum) throw new Error("La duración inicial no puede superar el máximo de control humano.");
    if (grace > maximum) throw new Error("El tiempo de gracia no puede superar el máximo de control humano.");
  }
}
