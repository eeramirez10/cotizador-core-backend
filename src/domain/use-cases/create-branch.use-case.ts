import { CreateBranchRequestDto } from "../dtos/request/create-branch-request.dto";
import { BranchResponseDto } from "../dtos/response/branch-response.dto";
import { BranchRepository } from "../repositories/branch.repository";

export class CreateBranchUseCase {
  constructor(private readonly branchRepository: BranchRepository) {}

  async execute(dto: CreateBranchRequestDto): Promise<BranchResponseDto> {
    const codeExists = await this.branchRepository.existsByCode(dto.code);
    if (codeExists) throw new Error("Branch code already exists.");

    const created = await this.branchRepository.create({
      code: dto.code,
      name: dto.name,
      address: dto.address,
    });

    return new BranchResponseDto(created);
  }
}
