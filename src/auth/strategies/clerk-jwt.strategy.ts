import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth.service';
import { ClerkApiService } from '../clerk-api.service';

@Injectable()
export class ClerkJwtStrategy extends PassportStrategy(Strategy, 'clerk-jwt') {
  private readonly logger = new Logger(ClerkJwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private authService: AuthService,
    private clerkApi: ClerkApiService,
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
    publicMetadata?: { admin?: boolean };
    public_metadata?: { admin?: boolean };
  }): Promise<User & { isAdmin: boolean }> {
    let user = await this.prisma.user.findUnique({
      where: { clerkId: payload.sub },
    });

    // En el primer login (o si el webhook aún no llegó) traemos los datos
    // reales del usuario desde la Clerk Backend API y lo guardamos.
    if (!user) {
      this.logger.log(
        `Usuario ${payload.sub} no está en la BD, obteniendo datos de Clerk`,
      );
      user = await this.provisionFromClerk(payload.sub);
    } else if (user.email.endsWith('@clerk.dev')) {
      // Auto-corrige filas creadas antes con datos placeholder.
      this.logger.log(
        `Usuario ${payload.sub} tiene datos placeholder, refrescando desde Clerk`,
      );
      user = (await this.provisionFromClerk(payload.sub)) ?? user;
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isAdmin =
      payload.publicMetadata?.admin === true ||
      payload.public_metadata?.admin === true;

    return { ...user, isAdmin };
  }

  /** Trae los datos del usuario desde Clerk y hace upsert en la BD. */
  private async provisionFromClerk(clerkId: string): Promise<User | null> {
    const clerkData = await this.clerkApi.getUser(clerkId);
    if (!clerkData) {
      return null;
    }

    try {
      return await this.authService.upsertUser(clerkData);
    } catch {
      // Posible carrera con el webhook u otra request creando el mismo usuario.
      return this.prisma.user.findUnique({ where: { clerkId } });
    }
  }
}
