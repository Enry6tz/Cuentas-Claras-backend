import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: { isAdmin?: boolean };
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const user = request.user;

    if (!user?.isAdmin) {
      throw new ForbiddenException({
        code: 'ADMIN_ONLY',
        message: 'Acceso denegado. Se requieren permisos de administrador.',
      });
    }

    return true;
  }
}
