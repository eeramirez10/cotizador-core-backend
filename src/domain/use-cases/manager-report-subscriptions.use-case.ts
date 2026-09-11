import type { UpsertManagerReportSubscriptionRequestDto } from "../dtos/request/upsert-manager-report-subscription-request.dto";
import type { ManagerReportSubscriptionEntity } from "../entities/manager-report-subscription.entity";
import { ManagerReportSubscriptionRepository } from "../repositories/manager-report-subscription.repository";
import { WhatsAppPhone } from "../utils/whatsapp-phone";

interface ManagerReportActor {
  id: string;
  role: string;
}

export class ManagerReportSubscriptionsUseCase {
  constructor(private readonly repository: ManagerReportSubscriptionRepository) {}

  async list(actor: ManagerReportActor): Promise<ManagerReportSubscriptionEntity[]> {
    this.assertAdmin(actor);
    return this.repository.listAll();
  }

  async create(
    dto: UpsertManagerReportSubscriptionRequestDto,
    actor: ManagerReportActor,
  ): Promise<ManagerReportSubscriptionEntity> {
    this.assertAdmin(actor);
    await this.validateConfiguration(dto, undefined);
    return this.repository.create({ ...dto.props, actorUserId: actor.id });
  }

  async update(
    id: string,
    dto: UpsertManagerReportSubscriptionRequestDto,
    actor: ManagerReportActor,
  ): Promise<ManagerReportSubscriptionEntity> {
    this.assertAdmin(actor);
    const current = await this.repository.findById(id);
    if (!current) throw new Error("Report subscription not found.");
    await this.validateConfiguration(dto, id);
    const updated = await this.repository.update(id, { ...dto.props, actorUserId: actor.id });
    if (!updated) throw new Error("Report subscription not found.");
    return updated;
  }

  async setActive(id: string, isActive: boolean, actor: ManagerReportActor): Promise<ManagerReportSubscriptionEntity> {
    this.assertAdmin(actor);
    const current = await this.repository.findById(id);
    if (!current) throw new Error("Report subscription not found.");
    if (isActive) {
      const recipient = await this.repository.findRecipient(current.recipientUserId);
      this.assertEligibleRecipient(recipient);
      if (current.scope === "BRANCH") await this.assertActiveBranch(current.branchId);
    }
    const updated = await this.repository.setActive(id, isActive, actor.id);
    if (!updated) throw new Error("Report subscription not found.");
    return updated;
  }

  private async validateConfiguration(
    dto: UpsertManagerReportSubscriptionRequestDto,
    excludeId: string | undefined,
  ): Promise<void> {
    const recipient = await this.repository.findRecipient(dto.props.recipientUserId);
    this.assertEligibleRecipient(recipient);
    if (dto.props.scope === "BRANCH") await this.assertActiveBranch(dto.props.branchId);
    if (await this.repository.existsForRecipient(dto.props.recipientUserId, dto.props.reportType, excludeId)) {
      throw new Error("The recipient already has this report subscription.");
    }
  }

  private assertEligibleRecipient(
    recipient: Awaited<ReturnType<ManagerReportSubscriptionRepository["findRecipient"]>>,
  ): void {
    if (!recipient?.isActive) throw new Error("Report recipient not found or inactive.");
    if (!(["ADMIN", "MANAGER"] as string[]).includes(recipient.role)) {
      throw new Error("Only ADMIN or MANAGER users can receive management reports.");
    }
    if (!WhatsAppPhone.create(recipient.phone)) {
      throw new Error("The report recipient must have a valid WhatsApp phone number.");
    }
  }

  private async assertActiveBranch(branchId: string | null): Promise<void> {
    if (!branchId) throw new Error("Branch is required for BRANCH scope.");
    const branch = await this.repository.findBranch(branchId);
    if (!branch?.isActive) throw new Error("Report branch not found or inactive.");
  }

  private assertAdmin(actor: ManagerReportActor): void {
    if (actor.role !== "ADMIN") throw new Error("Only ADMIN can manage report subscriptions.");
  }
}
