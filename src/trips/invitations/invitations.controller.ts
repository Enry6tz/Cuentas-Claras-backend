import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { ParticipationRole, User } from '@prisma/client';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { Roles, TripAccessGuard } from '../../common/guards/trip-role.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationEntity } from './entities/invitation.entity';

@ApiTags('Invitations')
@ApiBearerAuth()
@ApiExtraModels(InvitationEntity)
@ApiUnauthorizedResponse({
  description: 'Falta JWT, está vencido, o es inválido.',
  type: ErrorResponseDto,
})
@UseGuards(ClerkAuthGuard, TripAccessGuard)
@Controller('trips/:tripId/invitations')
export class InvitationsController {
  constructor(private invitationsService: InvitationsService) {}

  @Get()
  @Roles(ParticipationRole.CREATOR)
  @ApiOperation({
    summary: 'Listar invitaciones del viaje',
    description:
      'Devuelve las invitaciones del viaje (pendientes e históricas) con datos del invitado y de quien invitó. Solo el CREATOR puede verlas.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiOkResponse({
    description: 'Lista de invitaciones.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(InvitationEntity) },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Solo el creador del viaje puede realizar esta acción.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Viaje no encontrado.',
    type: ErrorResponseDto,
  })
  findAll(@Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.invitationsService.findByTrip(tripId);
  }

  @Post()
  @Roles(ParticipationRole.CREATOR)
  @ApiOperation({
    summary: 'Invitar a un usuario al viaje',
    description:
      'Crea una invitación pendiente para un usuario registrado, con el rol indicado (MEMBER o SUPERVISOR). El usuario recién se une al viaje cuando acepta. Solo el CREATOR puede invitar.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiBody({ type: CreateInvitationDto })
  @ApiCreatedResponse({
    description: 'Invitación creada.',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(InvitationEntity) },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Body inválido, viaje finalizado o rol inválido.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Solo el creador del viaje puede realizar esta acción.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Viaje o usuario no encontrado.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'El usuario ya participa en el viaje o ya tiene una invitación pendiente.',
    type: ErrorResponseDto,
  })
  create(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.createInvitation(
      tripId,
      user.id,
      dto.userId,
      dto.role,
    );
  }

  @Delete(':invitationId')
  @Roles(ParticipationRole.CREATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancelar una invitación pendiente',
    description:
      'Cancela una invitación que aún está pendiente. Solo el CREATOR puede cancelarla.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiParam({ name: 'invitationId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Invitación cancelada.' })
  @ApiBadRequestResponse({
    description: 'La invitación ya no está pendiente.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Solo el creador del viaje puede realizar esta acción.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Viaje o invitación no encontrada.',
    type: ErrorResponseDto,
  })
  async cancel(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: User,
  ) {
    await this.invitationsService.cancel(tripId, user.id, invitationId);
  }
}
