import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { checkAccountStatus } from '@/common/utils/account-status.util';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    // findUnique goes through PrismaService's soft-delete middleware, which
    // already excludes deletedAt users — no separate deletedAt check needed.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountStatus: true,
        suspendedUntil: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or deleted');
    }

    const status = checkAccountStatus(user.accountStatus, user.suspendedUntil);
    if (status.blocked) {
      throw new UnauthorizedException(status.message);
    }
    if (status.shouldReactivate) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { accountStatus: 'ACTIVE', suspendedUntil: null },
      });
    }

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
