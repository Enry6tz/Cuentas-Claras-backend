import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/** Datos normalizados de un usuario de Clerk, listos para upsert en la BD. */
export interface ClerkUserData {
  clerkId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/** Forma parcial de la respuesta de GET /v1/users/{id} de la Clerk Backend API. */
interface ClerkApiUser {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: { id: string; email_address: string }[];
}

@Injectable()
export class ClerkApiService {
  private readonly logger = new Logger(ClerkApiService.name);
  private readonly apiUrl = 'https://api.clerk.com/v1';

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Trae los datos reales del usuario desde Clerk usando el secret key.
   * Devuelve null si no hay secret key, si Clerk falla, o si el usuario no
   * tiene un email primario (no queremos guardar datos incompletos).
   */
  async getUser(clerkUserId: string): Promise<ClerkUserData | null> {
    const secretKey = this.configService.get<string>('clerk.secretKey');
    if (!secretKey) {
      this.logger.error('CLERK_SECRET_KEY no está configurado');
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.http.get<ClerkApiUser>(`${this.apiUrl}/users/${clerkUserId}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        }),
      );
      return this.normalize(data);
    } catch (err) {
      this.logger.error(
        `No se pudo obtener el usuario ${clerkUserId} de Clerk`,
        err,
      );
      return null;
    }
  }

  private normalize(data: ClerkApiUser): ClerkUserData | null {
    const primaryEmail =
      data.email_addresses?.find(
        (e) => e.id === data.primary_email_address_id,
      )?.email_address ?? data.email_addresses?.[0]?.email_address;

    if (!primaryEmail) {
      this.logger.warn(`El usuario ${data.id} de Clerk no tiene email`);
      return null;
    }

    const name =
      [data.first_name, data.last_name].filter(Boolean).join(' ') || 'User';

    return {
      clerkId: data.id,
      email: primaryEmail,
      name,
      avatarUrl: data.image_url ?? null,
    };
  }
}
