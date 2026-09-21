import assert from "node:assert/strict";
import test from "node:test";
import { UpdateSystemSettingsRequestDto } from "../src/domain/dtos/request/update-system-settings-request.dto";
import type { SystemSettingKey, SystemSettingRecord, SystemSettingValue } from "../src/domain/entities/system-setting.entity";
import { SystemSettingRepository } from "../src/domain/repositories/system-setting.repository";
import { SystemSettingsRuntime } from "../src/domain/services/system-settings-runtime";
import { ManageSystemSettingsUseCase } from "../src/domain/use-cases/manage-system-settings.use-case";

class StubRepository extends SystemSettingRepository {
  updated: Array<{ key: SystemSettingKey; value: SystemSettingValue }> = [];
  reset: SystemSettingKey[] = [];
  async list(): Promise<SystemSettingRecord[]> { return []; }
  async upsertMany(input: { settings: Array<{ key: SystemSettingKey; value: SystemSettingValue }> }): Promise<void> {
    this.updated = input.settings;
  }
  async resetMany(input: { keys: SystemSettingKey[] }): Promise<void> { this.reset = input.keys; }
}

class StubRuntime extends SystemSettingsRuntime {
  values = new Map<SystemSettingKey, SystemSettingValue>([
    ["QUOTE_INTERNAL_APPROVAL_ENABLED", false],
    ["REQUISITION_INTERNAL_APPROVAL_ENABLED", false],
    ["SELLER_EXCEL_IMPORT_ENABLED", true],
    ["WHATSAPP_INBOX_ENABLED", true],
    ["WHATSAPP_ASSISTANT_ENABLED", false],
    ["WHATSAPP_HUMAN_TAKEOVER_MINUTES", 15],
    ["WHATSAPP_HUMAN_RESPONSE_GRACE_MINUTES", 5],
    ["WHATSAPP_HUMAN_TAKEOVER_MAX_MINUTES", 60],
  ]);
  async refresh(): Promise<void> {}
  value(key: SystemSettingKey): SystemSettingValue { return this.values.get(key)!; }
  boolean(key: SystemSettingKey): boolean { return this.value(key) === true; }
  number(key: SystemSettingKey): number { return Number(this.value(key)); }
  record(_key: SystemSettingKey): SystemSettingRecord | undefined { return undefined; }
}

test("updates a validated operational setting", async () => {
  const repository = new StubRepository();
  const runtime = new StubRuntime();
  const useCase = new ManageSystemSettingsUseCase(repository, runtime);
  const [error, dto] = UpdateSystemSettingsRequestDto.create({
    settings: [{ key: "WHATSAPP_HUMAN_TAKEOVER_MINUTES", value: 20 }],
  });
  assert.equal(error, undefined);
  await useCase.update(dto!, "admin-id");
  assert.deepEqual(repository.updated, [{ key: "WHATSAPP_HUMAN_TAKEOVER_MINUTES", value: 20 }]);
});

test("rejects takeover duration above its configured maximum", async () => {
  const repository = new StubRepository();
  const useCase = new ManageSystemSettingsUseCase(repository, new StubRuntime());
  const [, dto] = UpdateSystemSettingsRequestDto.create({
    settings: [
      { key: "WHATSAPP_HUMAN_TAKEOVER_MINUTES", value: 60 },
      { key: "WHATSAPP_HUMAN_TAKEOVER_MAX_MINUTES", value: 30 },
    ],
  });
  await assert.rejects(() => useCase.update(dto!, "admin-id"), /no puede superar/);
  assert.deepEqual(repository.updated, []);
});
