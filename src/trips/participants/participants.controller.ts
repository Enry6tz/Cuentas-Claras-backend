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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { TripAccessGuard, Roles } from '../../common/guards/trip-role.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { ParticipantsService } from './participants.service';
import { ChangeRoleDto } from './dto/change-role.dto';
import { ParticipantEntity } from './entities/participant.entity';
import { ParticipationRole } from '@prisma/client';

@ApiTags('Participants')
@ApiBearerAuth()
@ApiExtraModels(ParticipantEntity)
@ApiUnauthorizedResponse({
  description: 'Falta JWT, está vencido, o es inválido.',
  type: ErrorResponseDto,
})
@UseGuards(ClerkAuthGuard, TripAccessGuard)
@Controller('trips/:tripId/participants')
export class ParticipantsController {
  constructor(private participantsService: ParticipantsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar integrantes del viaje',
    description:
      'Devuelve la lista de integrantes del viaje con su rol, balance y datos públicos del usuario. Requiere ser participante del viaje.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid', description: 'UUID del viaje' })
  @ApiOkResponse({
    description: 'Lista de integrantes.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ParticipantEntity) },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'No eres participante de este viaje.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Viaje no encontrado.',
    type: ErrorResponseDto,
  })
  findAll(@Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.participantsService.findByTrip(tripId);
  }

  // El alta directa de integrantes se reemplazó por el sistema de invitaciones
  // (POST /trips/:tripId/invitations). El usuario ahora se une al viaje sólo al
  // aceptar la invitación. Ver InvitationsController.

  @Patch(':userId')
  @Roles(ParticipationRole.CREATOR)
  @ApiOperation({
    summary: 'Cambiar rol de un integrante',
    description:
      'Cambia el rol de un integrante (SUPERVISOR o MEMBER). Solo el CREATOR puede cambiar roles.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid', description: 'UUID del integrante' })
  @ApiBody({ type: ChangeRoleDto })
  @ApiOkResponse({
    description: 'Rol actualizado.',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(ParticipantEntity) },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Body inválido o no puedes cambiar tu propio rol siendo CREATOR.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Solo el creador del viaje puede realizar esta acción.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Viaje o integrante no encontrado.',
    type: ErrorResponseDto,
  })
  changeRole(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: User,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.participantsService.changeRole(
      tripId,
      user.id,
      targetUserId,
      dto.role,
    );
  }

  @Delete(':userId')
  @Roles(ParticipationRole.CREATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Quitar integrante del viaje',
    description:
      'Quita a un integrante del viaje. Solo el CREATOR puede quitar. El balance del integrante debe ser 0.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiNoContentResponse({
    description: 'Integrante eliminado.',
  })
  @ApiForbiddenResponse({
    description: 'Solo el creador del viaje puede realizar esta acción.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Viaje o integrante no encontrado.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'No se puede quitar porque el balance no es 0.',
    type: ErrorResponseDto,
  })
  async remove(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: User,
  ) {
    await this.participantsService.removeParticipant(
      tripId,
      user.id,
      targetUserId,
    );
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Abandonar el viaje',
    description:
      'El usuario autenticado abandona el viaje. El balance debe ser 0. El CREATOR no puede abandonar.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiNoContentResponse({
    description: 'Has abandonado el viaje.',
  })
  @ApiBadRequestResponse({
    description: 'El creador no puede abandonar el viaje.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'No eres participante de este viaje.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Viaje no encontrado.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'No puedes abandonar porque tu balance no es 0.',
    type: ErrorResponseDto,
  })
  async leave(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @CurrentUser() user: User,
  ) {
    await this.participantsService.leaveTrip(tripId, user.id);
  }
}
