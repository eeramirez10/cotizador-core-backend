import type { ErpInventoryVisibilityRepository } from "../../domain/contracts/erp-inventory.port";
import { parseErpInventoryVisibility } from "../../domain/dtos/request/erp-inventory-query.dto";
import { prisma } from "../database/prisma-client";

const key = "ERP_INVENTORY_VISIBLE_WAREHOUSES";

export class PrismaErpInventoryVisibilityRepository implements ErpInventoryVisibilityRepository {
  async read(): Promise<string[] | null> {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    if (!row) return null;
    const value = row.value;
    return parseErpInventoryVisibility(
      value && typeof value === "object" && !Array.isArray(value) ? value.warehouseCodes : undefined,
    );
  }

  async save(warehouseCodes: string[] | null, actorUserId: string): Promise<void> {
    const value = { warehouseCodes };
    await prisma.$transaction(async (tx) => {
      const previous = await tx.systemSetting.findUnique({ where: { key } });
      await tx.systemSetting.upsert({
        where: { key },
        create: { key, value, updatedByUserId: actorUserId },
        update: { value, updatedByUserId: actorUserId },
      });
      await tx.auditLog.create({
        data: {
          actorUserId, entityType: "SYSTEM_SETTING", entityId: key, action: "SYSTEM_SETTING_UPDATED",
          payload: { previousValue: previous?.value ?? null, newValue: value },
        },
      });
    });
  }
}
