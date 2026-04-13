import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { Match } from '../decorators/match.decorator';

export class RegisterDto {
  @IsEmail({}, { message: 'Некорректный формат email' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @MaxLength(128, { message: 'Пароль не должен превышать 128 символов' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Пароль должен содержать строчную букву, заглавную букву и цифру',
  })
  password: string;

  @IsString()
  @Match('password', { message: 'Пароли не совпадают' })
  confirmPassword: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
