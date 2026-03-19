import { BranchRepository } from "../repositories/branch.repository";

export class DeactivateBranchUseCase {
  constructor(private readonly branchRepository: BranchRepository) {}

  async execute(branchId: string): Promise<void> {
    const existing = await this.branchRepository.findById(branchId);
    if (!existing || !existing.isActive) throw new Error("Branch not found.");

    const hasActiveUsers = await this.branchRepository.hasActiveUsers(branchId);
    if (hasActiveUsers) {
      throw new Error("Cannot deactivate branch with active users.");
    }

    const deactivated = await this.branchRepository.softDeactivateById(branchId);
    if (!deactivated) throw new Error("Branch not found.");
  }
}
