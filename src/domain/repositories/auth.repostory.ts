import { AuthUserEntity } from "../entities/auth-user.entity";

export abstract class AuthRepository {
  abstract findActiveByEmail(email: string): Promise<AuthUserEntity | null>;
  abstract findActiveById(id: string): Promise<AuthUserEntity | null>;
}