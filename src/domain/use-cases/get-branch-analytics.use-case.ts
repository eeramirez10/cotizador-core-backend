import type { UserRole } from "../../infrastructure/database/generated/enums";
import { AnalyticsQueryRequestDto } from "../dtos/request/analytics-query-request.dto";
import { AnalyticsRepository } from "../repositories/analytics.repository";
import { BranchRepository } from "../repositories/branch.repository";

interface ActorContext { role: UserRole; branchId: string }

export class GetBranchAnalyticsUseCase {
  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly branchRepository: BranchRepository
  ) {}

  async execute(dto: AnalyticsQueryRequestDto, actor: ActorContext) {
    if (actor.role === "SELLER") throw new Error("Branch analytics are not available for SELLER.");
    const branchId = actor.role === "ADMIN" && dto.branchId ? dto.branchId : actor.branchId;
    const branch = await this.branchRepository.findById(branchId);
    if (!branch || !branch.isActive) throw new Error("Branch not found.");

    return this.analyticsRepository.getDashboard({
      scopeType: "BRANCH",
      scopeId: branch.id,
      scopeName: branch.name,
      from: dto.from,
      toExclusive: dto.toExclusive,
      currency: dto.currency,
    });
  }
}
