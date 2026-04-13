import { IsEmail, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  passwordHash: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
