import type { Prisma } from "../database/generated/client";
import type { SystemSettingKey, SystemSettingRecord, SystemSettingValue } from "../../domain/entities/system-setting.entity";
import { SystemSettingRepository } from "../../domain/repositories/system-setting.repository";
import { prisma } from "../database/prisma-client";

const parseValue = (value: Prisma.JsonValue): SystemSettingValue | null => {
  if (typeof value === "boolean" || typeof value === "number") return value;
  return null;
};

export class PrismaSystemSettingRepository extends SystemSettingRepository {
  async list(): Promise<SystemSettingRecord[]> {
    const rows = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
    return rows.flatMap((row) => {
      const value = parseValue(row.value);
      return value === null ? [] : [{
        key: row.key as SystemSettingKey,
        value,
        updatedByUserId: row.updatedByUserId,
        updatedAt: row.updatedAt,
      }];
    });
  }

  async upsertMany(input: {
    settings: Array<{ key: SystemSettingKey; value: SystemSettingValue }>;
    actorUserId: string;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const setting of input.settings) {
        const previous = await tx.systemSetting.findUnique({ where: { key: setting.key } });
        await tx.systemSetting.upsert({
          where: { key: setting.key },
          create: { key: setting.key, value: setting.value, updatedByUserId: input.actorUserId },
          update: { value: setting.value, updatedByUserId: input.actorUserId },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: input.actorUserId,
            entityType: "SYSTEM_SETTING",
            entityId: setting.key,
            action: "SYSTEM_SETTING_UPDATED",
            payload: {
              previousValue: previous?.value ?? null,
              newValue: setting.value,
            },
          },
        });
      }
    });
  }

  async resetMany(input: { keys: SystemSettingKey[]; actorUserId: string }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.systemSetting.findMany({ where: { key: { in: input.keys } } });
      await tx.systemSetting.deleteMany({ where: { key: { in: input.keys } } });
      for (const row of existing) {
        await tx.auditLog.create({
          data: {
            actorUserId: input.actorUserId,
            entityType: "SYSTEM_SETTING",
            entityId: row.key,
            action: "SYSTEM_SETTING_RESET",
            payload: { previousValue: row.value },
          },
        });
      }
    });
  }
}
