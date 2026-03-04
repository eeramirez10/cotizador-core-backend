import { AuthUserResponseDto } from '../dtos/response/auth-user-response.dto';
import { AuthRepository } from '../repositories/auth.repostory';

export class GetAuthUserUseCase {
  constructor(private readonly authRepository: AuthRepository) { }

  async execute(userId: string) {

    const user = await this.authRepository.findActiveById(userId);

    if (!user) throw new Error('User not found')

    return new AuthUserResponseDto(user)
  }
}