import { UserEntity } from "../../domain/entities/user.entity";
import type { UserRole } from "../database/generated/enums";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  whatsappPhoneE164: string | null;
  erpUserCode: string | null;
  branch: {
    id: string;
    code: string;
    name: string;
  };
}

export class UserMapper {
  static toEntity(row: UserRow): UserEntity {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      username: row.username,
      email: row.email,
      role: row.role,
      isActive: row.isActive,
      phone: row.phone,
      whatsappPhoneE164: row.whatsappPhoneE164,
      erpUserCode: row.erpUserCode,
      branch: {
        id: row.branch.id,
        code: row.branch.code,
        name: row.branch.name,
      },
    };
  }
}
