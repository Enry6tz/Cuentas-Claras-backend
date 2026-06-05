import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { ParticipantEntity } from '../participants/entities/participant.entity';
import { InvitationsService } from './invitations.service';
import { InvitationEntity } from './entities/invitation.entity';

@ApiTags('Invitations')
@ApiBearerAuth()
@ApiExtraModels(InvitationEntity, ParticipantEntity)
@ApiUnauthorizedResponse({
  description: 'Falta JWT, está vencido, o es inválido.',
  type: ErrorResponseDto,
})
@UseGuards(ClerkAuthGuard)
@Controller('invitations')
export class MyInvitationsController {
  constructor(private invitationsService: InvitationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar mis invitaciones pendientes',
    description:
      'Devuelve las invitaciones PENDING recibidas por el usuario autenticado, con el viaje y quién invitó.',
  })
  @ApiOkResponse({
    description: 'Lista de invitaciones pendientes.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(InvitationEntity) },
        },
      },
    },
  })
  findMine(@CurrentUser() user: User) {
    return this.invitationsService.findForUser(user.id);
  }

  @Post(':invitationId/accept')
  @ApiOperation({
    summary: 'Aceptar una invitación',
    description:
      'Acepta una invitación pendiente. Crea la participación en el viaje con el rol indicado en la invitación.',
  })
  @ApiParam({ name: 'invitationId', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Invitación aceptada; devuelve la nueva participación.',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(ParticipantEntity) },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'La invitación ya no está pendiente o el viaje está finalizado.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Esta invitación no es para ti.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Invitación o viaje no encontrado.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Ya participas en este viaje.',
    type: ErrorResponseDto,
  })
  accept(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: User,
  ) {
    return this.invitationsService.accept(invitationId, user.id);
  }

  @Post(':invitationId/reject')
  @ApiOperation({
    summary: 'Rechazar una invitación',
    description: 'Rechaza una invitación pendiente recibida.',
  })
  @ApiParam({ name: 'invitationId', format: 'uuid' })
  @ApiOkResponse({
    description: 'Invitación rechazada.',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(InvitationEntity) },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'La invitación ya no está pendiente.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Esta invitación no es para ti.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Invitación no encontrada.',
    type: ErrorResponseDto,
  })
  reject(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: User,
  ) {
    return this.invitationsService.reject(invitationId, user.id);
  }
}
