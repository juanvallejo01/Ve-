import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PostgresService } from '@/common/database/postgres.service';
import { RedisService } from '@/common/redis/redis.service';
import { MailService } from '@/common/mail/mail.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { checkAccountStatus } from '@/common/utils/account-status.util';
import { isAllowedEmailDomain } from './constants/allowed-email-domains';

// ── Configuración del segundo factor (2FA) por correo ──
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private postgres: PostgresService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    @Optional() private redisService?: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    // USConnect is exclusive to students of Cali universities — restrict
    // sign-ups to their institutional email domains. Login/OTP verification
    // are intentionally left unrestricted so existing accounts (registered
    // before this check existed) keep working.
    if (!isAllowedEmailDomain(dto.email)) {
      throw new BadRequestException(
        'Debes registrarte con tu correo institucional de una universidad de Cali (por ejemplo, @univalle.edu.co, @icesi.edu.co, @usc.edu.co).',
      );
    }

    // Check if user already exists using direct PostgreSQL
    const existingResult = await this.postgres.query(
      'SELECT id FROM users WHERE email = $1 AND "deletedAt" IS NULL LIMIT 1',
      [dto.email],
    );

    if (existingResult.rows.length > 0) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user using direct PostgreSQL
    const result = await this.postgres.query(
      `INSERT INTO users (id, name, nickname, email, password, major, role, "likesCount", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, 'USER', 0, NOW(), NOW())
       RETURNING id, name, nickname, email, major, role, "likesCount", "photoUrl", "createdAt", "updatedAt"`,
      [dto.name, dto.nickname || null, dto.email, hashedPassword, dto.major],
    );

    const user = result.rows[0];

    // Igual que en login(): la cuenta recién creada no recibe tokens de una
    // vez — se dispara el 2FA justo aquí, una sola vez, para confirmar el
    // correo antes de abrir la primera sesión.
    await this.issueTwoFactorCode(user.id, user.email, user.name);

    return {
      requiresTwoFactor: true,
      email: user.email,
      message: 'Hemos enviado un código de verificación a tu correo.',
    };
  }

  // TODO: Remove this after creating admin account - temporary endpoint
  async registerAdmin(dto: RegisterDto) {
    // Check if user already exists
    const existingResult = await this.postgres.query(
      'SELECT id FROM users WHERE email = $1 AND "deletedAt" IS NULL LIMIT 1',
      [dto.email],
    );

    if (existingResult.rows.length > 0) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create admin user
    const result = await this.postgres.query(
      `INSERT INTO users (id, name, email, password, major, role, "likesCount", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, 'ADMIN', 0, NOW(), NOW())
       RETURNING id, name, email, major, role, "likesCount", "photoUrl", "createdAt", "updatedAt"`,
      [dto.name, dto.email, hashedPassword, dto.major || 'Administration'],
    );

    const user = result.rows[0];

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        major: user.major,
        role: user.role,
        photoUrl: user.photoUrl,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Find user using direct PostgreSQL
    const result = await this.postgres.query(
      'SELECT id, name, nickname, email, password, major, role, "photoUrl", "bio", "bannerUrl", "deletedAt", "accountStatus", "suspendedUntil", "emailVerifiedAt" FROM users WHERE email = $1 LIMIT 1',
      [dto.email],
    );

    const user = result.rows[0];

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const status = checkAccountStatus(user.accountStatus, user.suspendedUntil);
    if (status.blocked) {
      throw new ForbiddenException(status.message);
    }
    if (status.shouldReactivate) {
      await this.postgres.query(
        'UPDATE users SET "accountStatus" = $1, "suspendedUntil" = NULL WHERE id = $2',
        ['ACTIVE', user.id],
      );
    }

    // Los administradores quedan exentos del 2FA (cuentas internas de
    // confianza) y reciben sus tokens de inmediato, como antes.
    if (user.role === 'ADMIN') {
      const tokens = await this.generateTokens(user.id, user.email, user.role);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
          major: user.major,
          role: user.role,
          photoUrl: user.photoUrl,
          bio: user.bio,
          bannerUrl: user.bannerUrl,
        },
        ...tokens,
      };
    }

    // El 2FA por correo solo se exige UNA vez en la vida de la cuenta: la
    // primera vez que se hace login tras crearla (emailVerifiedAt aún null).
    // Si ya se verificó antes, se omite por completo y se entregan los
    // tokens de una vez, igual que un login normal sin segundo factor.
    if (user.emailVerifiedAt) {
      const tokens = await this.generateTokens(user.id, user.email, user.role);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
          major: user.major,
          role: user.role,
          photoUrl: user.photoUrl,
          bio: user.bio,
          bannerUrl: user.bannerUrl,
        },
        ...tokens,
      };
    }

    // Cuenta todavía sin verificar (recién creada, o quedó a medias): se
    // dispara el segundo factor. Los tokens de sesión solo se emiten en
    // verifyOtp(), una vez el usuario confirma el código.
    await this.issueTwoFactorCode(user.id, user.email, user.name);

    return {
      requiresTwoFactor: true,
      email: user.email,
      message: 'Hemos enviado un código de verificación a tu correo.',
    };
  }

  /**
   * Segundo paso del login: valida el código OTP de 6 dígitos enviado por
   * correo y, si es correcto, recién ahí genera los tokens de sesión.
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const result = await this.postgres.query(
      'SELECT id, name, nickname, email, major, role, "photoUrl", "bio", "bannerUrl", "deletedAt", "accountStatus", "suspendedUntil", "emailVerifiedAt" FROM users WHERE email = $1 LIMIT 1',
      [dto.email],
    );

    const user = result.rows[0];

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // ── Lectura del OTP temporal ──
    // Se busca el código pendiente (consumedAt = null) más reciente para
    // este usuario en la tabla two_factor_codes (modelo TwoFactorCode).
    const otpRecord = await this.prisma.twoFactorCode.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'No hay un código pendiente. Inicia sesión de nuevo para recibir uno.',
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      await this.prisma.twoFactorCode.delete({ where: { id: otpRecord.id } });
      throw new BadRequestException(
        'El código expiró. Inicia sesión de nuevo para recibir uno nuevo.',
      );
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.twoFactorCode.delete({ where: { id: otpRecord.id } });
      throw new BadRequestException(
        'Demasiados intentos fallidos. Inicia sesión de nuevo para recibir un código nuevo.',
      );
    }

    const isCodeValid = await bcrypt.compare(dto.code, otpRecord.codeHash);

    if (!isCodeValid) {
      await this.prisma.twoFactorCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Código incorrecto');
    }

    const status = checkAccountStatus(user.accountStatus, user.suspendedUntil);
    if (status.blocked) {
      throw new ForbiddenException(status.message);
    }

    // Código correcto: se marca como consumido (no puede reutilizarse) y
    // recién ahora se emiten los tokens de sesión.
    await this.prisma.twoFactorCode.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    });

    // Primera verificación exitosa de esta cuenta: queda marcada para
    // siempre, así los próximos login() ya no vuelven a pedir el código.
    if (!user.emailVerifiedAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        major: user.major,
        role: user.role,
        photoUrl: user.photoUrl,
        bio: user.bio,
        bannerUrl: user.bannerUrl,
      },
      ...tokens,
    };
  }

  /**
   * Genera el código OTP de 2FA, lo guarda temporalmente y lo envía por correo.
   *
   * ── Dónde y cómo se guarda el OTP ──
   * Tabla: `two_factor_codes` (modelo `TwoFactorCode` en prisma/schema.prisma).
   * - `codeHash`: hash bcrypt del código de 6 dígitos — el código en texto
   *   plano NUNCA se persiste, solo se envía por correo una vez.
   * - `expiresAt`: ahora + 10 minutos (OTP_EXPIRY_MINUTES) — verifyOtp()
   *   rechaza cualquier intento después de esta fecha.
   * - `attempts`: contador de intentos fallidos; al llegar a OTP_MAX_ATTEMPTS
   *   el código queda invalidado aunque no haya expirado por tiempo.
   * - Antes de crear el nuevo código se eliminan los códigos pendientes
   *   anteriores del mismo usuario, de forma que "reenviar código" (volver
   *   a llamar a /auth/login) siempre deja un único OTP activo.
   */
  private async issueTwoFactorCode(userId: string, email: string, name: string) {
    await this.prisma.twoFactorCode.deleteMany({
      where: { userId, consumedAt: null },
    });

    // crypto.randomInt es criptográficamente seguro (a diferencia de Math.random)
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await this.prisma.twoFactorCode.create({
      data: { userId, codeHash, expiresAt },
    });

    await this.mailService.sendTwoFactorCode(email, code, name);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const result = await this.postgres.query(
      'SELECT id, name, email FROM users WHERE email = $1 AND "deletedAt" IS NULL LIMIT 1',
      [dto.email],
    );

    const user = result.rows[0];

    if (!user) {
      // Return a success message even if the user is not found to prevent email enumeration
      return { message: 'Si el correo está registrado, recibirás un código para restablecer tu contraseña.' };
    }

    await this.prisma.passwordResetCode.deleteMany({
      where: { userId: user.id, consumedAt: null },
    });

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await this.prisma.passwordResetCode.create({
      data: { userId: user.id, codeHash, expiresAt },
    });

    await this.mailService.sendPasswordResetCode(user.email, code, user.name);

    return { message: 'Si el correo está registrado, recibirás un código para restablecer tu contraseña.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const result = await this.postgres.query(
      'SELECT id FROM users WHERE email = $1 AND "deletedAt" IS NULL LIMIT 1',
      [dto.email],
    );

    const user = result.rows[0];

    if (!user) {
      throw new BadRequestException('El código o el correo no son válidos.');
    }

    const resetRecord = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRecord) {
      throw new BadRequestException('No hay un código pendiente. Solicita uno nuevo.');
    }

    if (resetRecord.expiresAt < new Date()) {
      await this.prisma.passwordResetCode.delete({ where: { id: resetRecord.id } });
      throw new BadRequestException('El código expiró. Solicita uno nuevo.');
    }

    if (resetRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.passwordResetCode.delete({ where: { id: resetRecord.id } });
      throw new BadRequestException('Demasiados intentos fallidos. Solicita un código nuevo.');
    }

    const isCodeValid = await bcrypt.compare(dto.code, resetRecord.codeHash);

    if (!isCodeValid) {
      await this.prisma.passwordResetCode.update({
        where: { id: resetRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Código incorrecto');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.prisma.passwordResetCode.update({
      where: { id: resetRecord.id },
      data: { consumedAt: new Date() },
    });

    return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      // Check if token is blacklisted (skip if Redis not available)
      if (this.redisService) {
        const isBlacklisted = await this.redisService.exists(`blacklist:${refreshToken}`);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      // Check if token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.user.deletedAt) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const status = checkAccountStatus(
        storedToken.user.accountStatus,
        storedToken.user.suspendedUntil,
      );
      if (status.blocked) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (status.shouldReactivate) {
        await this.prisma.user.update({
          where: { id: storedToken.user.id },
          data: { accountStatus: 'ACTIVE', suspendedUntil: null },
        });
      }

      // Check expiration
      if (storedToken.expiresAt < new Date()) {
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new UnauthorizedException('Refresh token expired');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(
        payload.sub,
        payload.email,
        storedToken.user.role,
      );

      // Delete old refresh token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    // Delete all refresh tokens for user
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // Blacklist the refresh token if provided (skip if Redis not available)
    if (refreshToken && this.redisService) {
      const ttl = 7 * 24 * 60 * 60; // 7 days
      await this.redisService.set(`blacklist:${refreshToken}`, '1', ttl);
    }

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiration'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiration'),
      }),
    ]);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
