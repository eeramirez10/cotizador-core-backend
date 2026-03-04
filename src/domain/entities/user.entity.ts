import type { UserRole } from "../../infrastructure/database/generated/enums";

export interface UserEntity {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  erpUserCode: string | null;
  branch: {
    id: string;
    code: string;
    name: string;
  };
}
