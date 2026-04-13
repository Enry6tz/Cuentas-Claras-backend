import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClerkJwtStrategy extends PassportStrategy(Strategy, 'clerk-jwt') {
  private readonly logger = new Logger(ClerkJwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const issuerUrl = configService.get<string>('clerk.issuerUrl');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        jwksUri: `${issuerUrl}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true,
      }),
      issuer: issuerUrl,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: {
    sub: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    image_url?: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { clerkId: payload.sub },
    });

    // Auto-create user if not found (webhook may not have arrived yet)
    if (!user) {
      this.logger.log(
        `User ${payload.sub} not in DB, creating from JWT claims`,
      );
      try {
        user = await this.prisma.user.create({
          data: {
            clerkId: payload.sub,
            email: payload.email ?? `${payload.sub}@clerk.dev`,
            name:
              [payload.first_name, payload.last_name]
                .filter(Boolean)
                .join(' ') || 'User',
            avatarUrl: payload.image_url ?? null,
          },
        });
      } catch {
        // Could fail if user was created between findUnique and create (race condition)
        user = await this.prisma.user.findUnique({
          where: { clerkId: payload.sub },
        });
      }
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
