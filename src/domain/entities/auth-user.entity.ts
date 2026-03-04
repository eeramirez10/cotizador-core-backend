export type UserRole = "ADMIN" | "SELLER" | "MANAGER";

export interface AuthUserEntity {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  branchId: string;
  branchName: string;
  erpUserCode: string | null;
  passwordHash: string;
}