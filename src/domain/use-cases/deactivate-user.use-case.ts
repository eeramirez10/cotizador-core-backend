import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UserRepository } from "../repositories/user.repository";

interface DeactivateUserActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class DeactivateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string, actor: DeactivateUserActorContext): Promise<void> {
    if (actor.id === userId) {
      throw new Error("You cannot deactivate your own user.");
    }

    const deactivated = await this.userRepository.softDeactivateById({
      id: userId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!deactivated) {
      throw new Error("User not found.");
    }
  }
}
