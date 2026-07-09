import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UserRepository } from "../repositories/user.repository";

interface ActivateUserActorContext {
  role: UserRole;
  branchId: string;
}

export class ActivateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string, actor: ActivateUserActorContext): Promise<void> {
    const activated = await this.userRepository.activateById({
      id: userId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!activated) {
      throw new Error("User not found.");
    }
  }
}
