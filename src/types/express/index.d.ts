
import type { UserRole } from "../../infrastructure/database/generated/enums";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        branchId: string;
        erpUserCode: string | null;
      };
    }
  }
}

export {};
