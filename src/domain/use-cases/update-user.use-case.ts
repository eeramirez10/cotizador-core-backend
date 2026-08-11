import { BcryptAdapter } from "../../infrastructure/adapters/bcrypt.adapter";
import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UpdateUserRequestDto } from "../dtos/request/update-user-request.dto";
import { UserResponseDto } from "../dtos/response/user-response.dto";
import { BranchRepository } from "../repositories/branch.repository";
import { UserRepository } from "../repositories/user.repository";

interface UpdateUserActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly branchRepository: BranchRepository
  ) {}

  async execute(
    userId: string,
    dto: UpdateUserRequestDto,
    actor: UpdateUserActorContext
  ): Promise<UserResponseDto> {
    const target = await this.userRepository.findById({
      id: userId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!target) throw new Error("User not found.");

    if (actor.role === "MANAGER" && !["SELLER", "PURCHASING"].includes(target.role)) {
      throw new Error("MANAGER can only update SELLER or PURCHASING users.");
    }

    if (actor.role === "MANAGER" && !["SELLER", "PURCHASING"].includes(dto.role)) {
      throw new Error("MANAGER can only assign SELLER or PURCHASING role.");
    }

    const branch = actor.role === "MANAGER"
      ? await this.branchRepository.findById(actor.branchId)
      : await this.branchRepository.findActiveByCode(dto.branchCode);
    if (!branch || !branch.isActive) throw new Error("Branch not found.");

    if (dto.email !== target.email) {
      const emailExists = await this.userRepository.existsByEmail(dto.email);
      if (emailExists) throw new Error("Email already exists.");
    }

    if (dto.username !== target.username) {
      const usernameExists = await this.userRepository.existsByUsername(dto.username);
      if (usernameExists) throw new Error("Username already exists.");
    }

    if (dto.phone && dto.phone !== target.phone) {
      const phoneExists = await this.userRepository.existsByPhone(dto.phone);
      if (phoneExists) throw new Error("Phone already exists.");
    }

    if (dto.erpUserCode && dto.erpUserCode !== target.erpUserCode) {
      const erpCodeExists = await this.userRepository.existsByErpUserCode(dto.erpUserCode);
      if (erpCodeExists) throw new Error("ERP user code already exists.");
    }

    const passwordHash = dto.password ? await BcryptAdapter.hash(dto.password) : undefined;

    const updated = await this.userRepository.updateById({
      id: userId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        username: dto.username,
        email: dto.email,
        role: dto.role,
        phone: dto.phone,
        erpUserCode: dto.erpUserCode,
        branchId: branch.id,
        passwordHash,
      },
    });

    if (!updated) throw new Error("User not found.");
    return new UserResponseDto(updated);
  }
}
