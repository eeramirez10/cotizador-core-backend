import { BcryptAdapter } from "../../infrastructure/adapters/bcrypt.adapter";
import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CreateUserRequestDto } from "../dtos/request/create-user-request.dto";
import { UserResponseDto } from "../dtos/response/user-response.dto";
import { BranchRepository } from "../repositories/branch.repository";
import { UserRepository } from "../repositories/user.repository";

interface CreateUserActorContext {
  role: UserRole;
  branchId: string;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly branchRepository: BranchRepository
  ) {}

  async execute(dto: CreateUserRequestDto, actor: CreateUserActorContext): Promise<UserResponseDto> {
    if (actor.role === "MANAGER" && dto.role === "ADMIN") {
      throw new Error("MANAGER cannot assign ADMIN role.");
    }

    const branch = await this.branchRepository.findActiveByCode(dto.branchCode);
    if (!branch) throw new Error("Branch not found.");

    if (actor.role === "MANAGER" && branch.id !== actor.branchId) {
      throw new Error("MANAGER can only assign users from own branch.");
    }

    const [emailExists, usernameExists] = await Promise.all([
      this.userRepository.existsByEmail(dto.email),
      this.userRepository.existsByUsername(dto.username),
    ]);

    if (emailExists) throw new Error("Email already exists.");
    if (usernameExists) throw new Error("Username already exists.");

    if (dto.erpUserCode) {
      const erpCodeExists = await this.userRepository.existsByErpUserCode(dto.erpUserCode);
      if (erpCodeExists) throw new Error("ERP user code already exists.");
    }

    const passwordHash = await BcryptAdapter.hash(dto.password);

    const user = await this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      username: dto.username,
      email: dto.email,
      passwordHash,
      role: dto.role,
      phone: dto.phone,
      erpUserCode: dto.erpUserCode,
      branchId: branch.id,
    });

    return new UserResponseDto(user);
  }
}
