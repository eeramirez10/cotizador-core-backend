import { AuthUserEntity } from "../entities/auth-user.entity";

export abstract class AuthDatasource {
  abstract findActiveByEmail(email: string): Promise<AuthUserEntity | null>;
  abstract findActiveById(id: string): Promise<AuthUserEntity | null>;
}