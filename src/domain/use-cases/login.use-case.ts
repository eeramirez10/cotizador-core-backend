import { AuthRepository } from '../repositories/auth.repostory';
import { LoginRequestDto } from '../dtos/request/login-request.dto';
import { BcryptAdapter } from '../../infrastructure/adapters/bcrypt.adapter';
import { JwtAdapter } from '../../infrastructure/adapters/jwt.adapter';
import { AuthUserResponseDto } from '../dtos/response/auth-user-response.dto';
import { LoginResponseDto } from '../dtos/response/login-response.dto';


export class LoginUseCase {

  constructor(private readonly authRepository:AuthRepository){}

  async execute(request:LoginRequestDto):Promise<LoginResponseDto>{

    const {password, email } = request

    const user = await this.authRepository.findActiveByEmail(email)

    if(!user){
      throw new Error('Invalid credentials')
    }

   const isValidPassword = await BcryptAdapter.compare(password, user.passwordHash)

   if(!isValidPassword){
    throw new Error('Invalid Credentials')
   }

   const accessToken = JwtAdapter.signAccessToken({
     sub: user.id,
     role: user.role,
     branchId: user.branchId,
     erpUserCode: user.erpUserCode
   })

   const authUserResponse = new AuthUserResponseDto(user)

   return new LoginResponseDto(accessToken, authUserResponse)
  }
}