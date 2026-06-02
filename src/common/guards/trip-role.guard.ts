import {
  ForbiddenException,
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ParticipationRole } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ParticipationRole[]) =>
  SetMetadata(ROLES_KEY, roles);

interface RequestWithUser extends Request {
  user?: { id: string; isAdmin?: boolean };
  params: Record<string, string>;
  participation?: unknown;
}

@Injectable()
export class TripAccessGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const user = request.user;
    const tripId = request.params.tripId;

    if (!tripId) {
      return true;
    }

    const requiredRoles = this.reflector.get<ParticipationRole[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    const method = request.method;
    const isReadOnly = method === 'GET';

    if (user?.isAdmin && isReadOnly) {
      return true;
    }

    if (!user?.id) {
      throw new ForbiddenException('No eres participante de este viaje');
    }

    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId: user.id, tripId } },
    });

    if (!participation) {
      throw new ForbiddenException('No eres participante de este viaje');
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(participation.role)) {
        throw new ForbiddenException(
          'No tienes permisos para realizar esta acción',
        );
      }
    }

    request.participation = participation;
    return true;
  }
}
