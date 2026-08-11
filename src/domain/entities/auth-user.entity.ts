export type UserRole = "ADMIN" | "SELLER" | "MANAGER" | "PURCHASING";

export interface AuthUserEntity {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  branchId: string;
  branchCode: string;
  branchName: string;
  erpUserCode: string | null;
  passwordHash: string;
}
