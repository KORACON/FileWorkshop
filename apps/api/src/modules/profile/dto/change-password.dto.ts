import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Match } from '../../auth/decorators/match.decorator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Текущий пароль обязателен' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Новый пароль должен содержать минимум 8 символов' })
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Пароль должен содержать строчную букву, заглавную букву и цифру',
  })
  newPassword: string;

  @IsString()
  @Match('newPassword', { message: 'Пароли не совпадают' })
  confirmNewPassword: string;
}
