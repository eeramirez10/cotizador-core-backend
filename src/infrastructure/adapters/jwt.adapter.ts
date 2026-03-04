import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "../database/generated/enums";
import { Envs } from "../../config/envs";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  branchId: string;
  erpUserCode: string | null;
}

export class JwtAdapter {
  static signAccessToken(payload: AccessTokenPayload): string {
    const options: SignOptions = { expiresIn: Envs.jwtExpiresIn as SignOptions["expiresIn"] };
    return jwt.sign(payload, Envs.jwtSeed, options);
  }

  static verifyAccessToken(token: string): AccessTokenPayload {
    const decoded = jwt.verify(token, Envs.jwtSeed);
    if (!decoded || typeof decoded !== "object") {
      throw new Error("Invalid token.");
    }

    const data = decoded as Partial<AccessTokenPayload>;
    if (!data.sub || !data.role || !data.branchId) {
      throw new Error("Invalid token payload.");
    }

    return {
      sub: data.sub,
      role: data.role,
      branchId: data.branchId,
      erpUserCode: data.erpUserCode ?? null,
    };
    }
}