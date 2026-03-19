import { UpdateBranchRequestDto } from "../dtos/request/update-branch-request.dto";
import { BranchResponseDto } from "../dtos/response/branch-response.dto";
import { BranchRepository } from "../repositories/branch.repository";

export class UpdateBranchUseCase {
  constructor(private readonly branchRepository: BranchRepository) {}

  async execute(branchId: string, dto: UpdateBranchRequestDto): Promise<BranchResponseDto> {
    const existing = await this.branchRepository.findById(branchId);
    if (!existing || !existing.isActive) throw new Error("Branch not found.");

    const codeExists = await this.branchRepository.existsByCode(dto.code, branchId);
    if (codeExists) throw new Error("Branch code already exists.");

    const updated = await this.branchRepository.updateById(branchId, {
      code: dto.code,
      name: dto.name,
      address: dto.address,
    });

    if (!updated) throw new Error("Branch not found.");
    return new BranchResponseDto(updated);
  }
}
