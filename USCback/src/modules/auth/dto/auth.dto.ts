import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

// Política de contraseñas (igual en la app: uscConnet/src/lib/password-policy.ts):
// mínimo 8 caracteres, al menos una mayúscula y un carácter especial.
const PASSWORD_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un carácter especial.';
const PASSWORD_PATTERN = /^(?=.*[A-ZÁÉÍÓÚÑ])(?=.*[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s]).{8,}$/;

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  nickname?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: PASSWORD_MESSAGE })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password!: string;

  @IsString()
  @IsNotEmpty()
  major!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @MinLength(8, { message: PASSWORD_MESSAGE })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}
