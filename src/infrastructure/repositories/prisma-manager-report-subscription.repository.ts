import type { ManagerReportSubscriptionEntity as ManagerReportSubscriptionEntityType } from "../../domain/entities/manager-report-subscription.entity";
import { ManagerReportSubscriptionEntity } from "../../domain/entities/manager-report-subscription.entity";
import {
  ManagerReportSubscriptionRepository,
  type ManagerReportBranch,
  type ManagerReportRecipient,
  type RecordManagerReportSendParams,
  type SaveManagerReportSubscriptionParams,
} from "../../domain/repositories/manager-report-subscription.repository";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";

const subscriptionInclude = {
  recipientUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      branch: { select: { id: true, code: true, name: true } },
    },
  },
  branch: { select: { id: true, code: true, name: true } },
  createdByUser: { select: { id: true, firstName: true, lastName: true } },
  updatedByUser: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ManagerReportSubscriptionInclude;

type SubscriptionRow = Prisma.ManagerReportSubscriptionGetPayload<{ include: typeof subscriptionInclude }>;

export class PrismaManagerReportSubscriptionRepository extends ManagerReportSubscriptionRepository {
  async listAll(): Promise<ManagerReportSubscriptionEntityType[]> {
    const rows = await prisma.managerReportSubscription.findMany({
      include: subscriptionInclude,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.toEntity(row));
  }

  async findById(id: string): Promise<ManagerReportSubscriptionEntityType | null> {
    const row = await prisma.managerReportSubscription.findUnique({
      where: { id },
      include: subscriptionInclude,
    });
    return row ? this.toEntity(row) : null;
  }

  async findRecipient(id: string): Promise<ManagerReportRecipient | null> {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true, phone: true },
    });
  }

  async findBranch(id: string): Promise<ManagerReportBranch | null> {
    return prisma.branch.findUnique({ where: { id }, select: { id: true, isActive: true } });
  }

  async existsForRecipient(recipientUserId: string, reportType: SaveManagerReportSubscriptionParams["reportType"], excludeId?: string): Promise<boolean> {
    const row = await prisma.managerReportSubscription.findFirst({
      where: { recipientUserId, reportType, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    return Boolean(row);
  }

  async create(params: SaveManagerReportSubscriptionParams): Promise<ManagerReportSubscriptionEntityType> {
    return this.mapUniqueError(async () => {
      const row = await prisma.$transaction(async (tx) => {
        const created = await tx.managerReportSubscription.create({
          data: {
            ...this.data(params),
            createdByUserId: params.actorUserId,
          },
          include: subscriptionInclude,
        });
        await tx.auditLog.create({
          data: {
            actorUserId: params.actorUserId,
            entityType: "MANAGER_REPORT_SUBSCRIPTION",
            entityId: created.id,
            action: "CREATE",
            payload: this.auditPayload(created),
          },
        });
        return created;
      });
      return this.toEntity(row);
    });
  }

  async update(id: string, params: SaveManagerReportSubscriptionParams): Promise<ManagerReportSubscriptionEntityType | null> {
    return this.mapUniqueError(async () => {
      try {
        const row = await prisma.$transaction(async (tx) => {
          const updated = await tx.managerReportSubscription.update({
            where: { id },
            data: { ...this.data(params), updatedByUserId: params.actorUserId },
            include: subscriptionInclude,
          });
          await tx.auditLog.create({
            data: {
              actorUserId: params.actorUserId,
              entityType: "MANAGER_REPORT_SUBSCRIPTION",
              entityId: updated.id,
              action: "UPDATE",
              payload: this.auditPayload(updated),
            },
          });
          return updated;
        });
        return this.toEntity(row);
      } catch (error) {
        if (this.isNotFound(error)) return null;
        throw error;
      }
    });
  }

  async setActive(id: string, isActive: boolean, actorUserId: string): Promise<ManagerReportSubscriptionEntityType | null> {
    try {
      const row = await prisma.$transaction(async (tx) => {
        const updated = await tx.managerReportSubscription.update({
          where: { id },
          data: { isActive, updatedByUserId: actorUserId },
          include: subscriptionInclude,
        });
        await tx.auditLog.create({
          data: {
            actorUserId,
            entityType: "MANAGER_REPORT_SUBSCRIPTION",
            entityId: updated.id,
            action: isActive ? "ACTIVATE" : "DEACTIVATE",
            payload: { isActive },
          },
        });
        return updated;
      });
      return this.toEntity(row);
    } catch (error) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async recordSendAttempt(id: string, params: RecordManagerReportSendParams): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        entityType: "MANAGER_REPORT_SUBSCRIPTION",
        entityId: id,
        action: params.status === "FAILED" ? "SEND_NOW_FAILED" : "SEND_NOW",
        payload: {
          trigger: "MANUAL",
          status: params.status,
          recipient: params.recipient,
          providerMessageId: params.providerMessageId,
          deliveryMode: params.deliveryMode,
          periodFrom: params.periodFrom,
          periodTo: params.periodTo,
          errorMessage: params.errorMessage,
        },
      },
    });
  }

  private data(params: SaveManagerReportSubscriptionParams) {
    return {
      recipientUserId: params.recipientUserId,
      reportType: params.reportType,
      scope: params.scope,
      branchId: params.branchId,
      frequency: params.frequency,
      reportRange: params.reportRange,
      dayOfWeek: params.dayOfWeek,
      dayOfMonth: params.dayOfMonth,
      sendHour: params.sendHour,
      sendMinute: params.sendMinute,
      timezone: params.timezone,
    };
  }

  private auditPayload(row: SubscriptionRow) {
    return {
      recipientUserId: row.recipientUserId,
      reportType: row.reportType,
      scope: row.scope,
      branchId: row.branchId,
      frequency: row.frequency,
      reportRange: row.reportRange,
      dayOfWeek: row.dayOfWeek,
      dayOfMonth: row.dayOfMonth,
      sendHour: row.sendHour,
      sendMinute: row.sendMinute,
      timezone: row.timezone,
      isActive: row.isActive,
    };
  }

  private toEntity(row: SubscriptionRow): ManagerReportSubscriptionEntity {
    const fullName = (firstName: string, lastName: string) => `${firstName} ${lastName}`.trim();
    return new ManagerReportSubscriptionEntity({
      id: row.id,
      reportType: row.reportType,
      recipient: {
        id: row.recipientUser.id,
        fullName: fullName(row.recipientUser.firstName, row.recipientUser.lastName),
        email: row.recipientUser.email,
        phone: row.recipientUser.phone,
        role: row.recipientUser.role,
        isActive: row.recipientUser.isActive,
        branch: row.recipientUser.branch,
      },
      scope: row.scope,
      branch: row.branch,
      frequency: row.frequency,
      reportRange: row.reportRange,
      dayOfWeek: row.dayOfWeek,
      dayOfMonth: row.dayOfMonth,
      sendHour: row.sendHour,
      sendMinute: row.sendMinute,
      timezone: row.timezone,
      isActive: row.isActive,
      createdBy: {
        id: row.createdByUser.id,
        fullName: fullName(row.createdByUser.firstName, row.createdByUser.lastName),
      },
      updatedBy: row.updatedByUser ? {
        id: row.updatedByUser.id,
        fullName: fullName(row.updatedByUser.firstName, row.updatedByUser.lastName),
      } : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private async mapUniqueError<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("The recipient already has this report subscription.");
      }
      throw error;
    }
  }

  private isNotFound(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
  }
}
