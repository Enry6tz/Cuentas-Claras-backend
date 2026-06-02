import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
import { UpdateTripDto } from '../trips/dto/update-trip.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Falta JWT, está vencido, o es inválido.',
  type: ErrorResponseDto,
})
@ApiForbiddenResponse({
  description: 'Acceso denegado. Se requieren permisos de administrador.',
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
  getAllTrips(@CurrentUser() user: User) {
    return this.adminService.getAllTrips();
  }

  @Get('trips/:id')
  @ApiOperation({
    summary: 'Detalle de un viaje (solo admin)',
    description: 'Devuelve el detalle de cualquier viaje sin requerir participación.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'UUID del viaje' })
  @ApiOkResponse({ description: 'Detalle del viaje.', type: TripEntity })
  @ApiNotFoundResponse({ description: 'No existe viaje con ese id.', type: ErrorResponseDto })
  getTripById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getTripById(id);
  }

  @Patch('trips/:id')
  @ApiOperation({
    summary: 'Actualizar cualquier viaje (solo admin)',
    description: 'Permite al administrador modificar cualquier viaje sin ser CREATOR.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateTripDto })
  @ApiOkResponse({ description: 'Viaje actualizado.', type: TripEntity })
  @ApiNotFoundResponse({ description: 'No existe viaje con ese id.', type: ErrorResponseDto })
  updateTrip(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.adminService.updateTrip(id, dto);
  }

  @Delete('trips/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar (soft delete) cualquier viaje (solo admin)',
    description: 'Permite al administrador eliminar cualquier viaje sin ser CREATOR.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Viaje eliminado (soft). Sin body.' })
  @ApiNotFoundResponse({ description: 'No existe viaje con ese id.', type: ErrorResponseDto })
  async removeTrip(@Param('id', ParseUUIDPipe) id: string) {
    await this.adminService.removeTrip(id);
  }
}
