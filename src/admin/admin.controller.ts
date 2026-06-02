import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { AdminService } from './admin.service';
import { TripEntity } from '../trips/entities/trip.entity';

@ApiTags('Admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Falta JWT, está vencido, o es inválido.',
  type: ErrorResponseDto,
})
@UseGuards(ClerkAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('trips')
  @ApiOperation({
    summary: 'Listar todos los viajes (solo admin)',
    description:
      'Devuelve todos los viajes del sistema sin filtrar por participación. Solo accesible para administradores globales.',
  })
  @ApiOkResponse({
    description: 'Lista de todos los viajes.',
    type: [TripEntity],
  })
  @ApiForbiddenResponse({
    description: 'Acceso denegado. Se requieren permisos de administrador.',
    type: ErrorResponseDto,
  })
  getAllTrips(@CurrentUser() user: User) {
    return this.adminService.getAllTrips();
  }
}
