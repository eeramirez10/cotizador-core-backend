import { AuthUserEntity } from "../../domain/entities/auth-user.entity";
import { AuthRepository } from "../../domain/repositories/auth.repostory";
import { AuthDatasource } from "../../domain/datasources/auth.datasource";

export class AuthRepositoryImpl implements AuthRepository {

  constructor(private readonly authDatasource: AuthDatasource) { }

  findActiveByEmail(email: string): Promise<AuthUserEntity | null> {
    return this.authDatasource.findActiveByEmail(email);
  }
  findActiveById(id: string): Promise<AuthUserEntity | null> {
    return this.authDatasource.findActiveById(id);
  }

}