import { BranchResponseDto } from "../dtos/response/branch-response.dto";
import { BranchRepository } from "../repositories/branch.repository";

export class GetBranchesUseCase {
  constructor(private readonly branchRepository: BranchRepository) {}

  async execute(): Promise<BranchResponseDto[]> {
    const branches = await this.branchRepository.findAllActive();
    return branches.map((branch) => new BranchResponseDto(branch));
  }
}
