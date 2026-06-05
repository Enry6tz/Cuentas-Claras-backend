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
import { User } from '@prisma/client';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationEntity } from './entities/invitation.entity';

@ApiTags('Invitations')
@ApiBearerAuth()
@ApiExtraModels(InvitationEntity)
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.', type: ErrorResponseDto })
@UseGuards(ClerkAuthGuard)
@Controller()
export class InvitationsController {
  constructor(private invitationsService: InvitationsService) {}

  @Post('trips/:tripId/invitations')
  @ApiOperation({
    summary: 'Invitar a un usuario al viaje',
    description:
      'Crea una invitación pendiente para que un usuario se una al viaje. Solo el CREATOR puede invitar. El usuario debe aceptar la invitación para unirse.',
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
  @ApiBadRequestResponse({ description: 'El viaje está finalizado.', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Solo el creador puede invitar.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Viaje o usuario no encontrado.', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'El usuario ya participa o ya tiene invitación pendiente.', type: ErrorResponseDto })
  create(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(tripId, user.id, dto.userId);
  }

  @Get('invitations/pending')
  @ApiOperation({
    summary: 'Mis invitaciones pendientes',
    description: 'Devuelve todas las invitaciones pendientes del usuario autenticado.',
  })
  @ApiOkResponse({
    description: 'Invitaciones pendientes.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(InvitationEntity) },
        },
      },
    },
  })
  findPending(@CurrentUser() user: User) {
    return this.invitationsService.findPendingForUser(user.id);
  }

  @Patch('invitations/:id/accept')
  @ApiOperation({
    summary: 'Aceptar invitación',
    description: 'Acepta una invitación pendiente. El usuario pasa a ser participante (MEMBER) del viaje.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'Invitación aceptada. Ahora eres participante del viaje.',
    schema: {
      properties: {
        data: { $ref: getSchemaPath('Participation') },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'La invitación ya fue procesada o el viaje no está activo.', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Esta invitación no te pertenece.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Invitación no encontrada.', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Ya eres participante de este viaje.', type: ErrorResponseDto })
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.invitationsService.accept(id, user.id);
  }

  @Patch('invitations/:id/decline')
  @ApiOperation({
    summary: 'Rechazar invitación',
    description: 'Rechaza una invitación pendiente.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'Invitación rechazada.',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(InvitationEntity) },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'La invitación ya fue procesada.', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Esta invitación no te pertenece.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Invitación no encontrada.', type: ErrorResponseDto })
  decline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.invitationsService.decline(id, user.id);
  }

  @Get('trips/:tripId/invitations')
  @ApiOperation({
    summary: 'Listar invitaciones del viaje',
    description: 'Devuelve todas las invitaciones (pendientes, aceptadas, rechazadas) de un viaje. Solo el CREATOR puede verlas.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiOkResponse({
    description: 'Invitaciones del viaje.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(InvitationEntity) },
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Solo el creador puede ver las invitaciones.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Viaje no encontrado.', type: ErrorResponseDto })
  findByTrip(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @CurrentUser() user: User,
  ) {
    return this.invitationsService.findByTrip(tripId);
  }

  @Delete('trips/:tripId/invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancelar invitación',
    description: 'Cancela una invitación pendiente. Solo el CREATOR puede cancelar.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Invitación cancelada.' })
  @ApiBadRequestResponse({ description: 'La invitación ya no está pendiente.', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Solo el creador puede cancelar.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Invitación no encontrada.', type: ErrorResponseDto })
  async cancel(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.invitationsService.cancel(tripId, id, user.id);
  }
}
