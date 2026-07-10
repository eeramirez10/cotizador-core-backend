import type { UserRole } from "../../infrastructure/database/generated/enums";
import { AnalyticsQueryRequestDto } from "../dtos/request/analytics-query-request.dto";
import { AnalyticsRepository } from "../repositories/analytics.repository";
import { UserRepository } from "../repositories/user.repository";

interface ActorContext { id: string; role: UserRole; branchId: string }

export class GetUserAnalyticsUseCase {
  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: AnalyticsQueryRequestDto, actor: ActorContext) {
    const requestedUserId = actor.role === "SELLER" ? actor.id : dto.userId || actor.id;
    const user = actor.role === "ADMIN"
      ? await this.userRepository.findActiveById(requestedUserId)
      : await this.userRepository.findById({
          id: requestedUserId,
          scope: { role: actor.role, branchId: actor.branchId },
        });
    if (!user || !user.isActive) throw new Error("User not found.");

    return this.analyticsRepository.getDashboard({
      scopeType: "USER",
      scopeId: user.id,
      scopeName: `${user.firstName} ${user.lastName}`.trim(),
      from: dto.from,
      toExclusive: dto.toExclusive,
      currency: dto.currency,
    });
  }
}
