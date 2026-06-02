import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { TripsService } from '../trips/trips.service';
import { BalancesService } from './balances.service';
import { BalanceEntryEntity, SettlementSuggestionEntity } from './entities/balance.entity';

@ApiTags('Balances')
@ApiBearerAuth()
@ApiExtraModels(BalanceEntryEntity, SettlementSuggestionEntity)
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.', type: ErrorResponseDto })
@UseGuards(ClerkAuthGuard)
@Controller('trips/:tripId/balances')
export class BalancesController {
  constructor(
    private readonly balancesService: BalancesService,
    private readonly tripsService: TripsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get balances per participant',
    description:
      'Returns the net balance for each participant in the trip. Positive balance means others owe them; negative means they owe others.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiOkResponse({
    description: 'List of balances.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(BalanceEntryEntity) },
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Not a participant.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Trip not found.', type: ErrorResponseDto })
  async getBalances(
    @CurrentUser() user: User,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    await this.tripsService.findOne(user.id, tripId);
    return this.balancesService.getBalances(tripId);
  }

  @Get('settlement')
  @ApiOperation({
    summary: 'Get settlement suggestions',
    description:
      'Returns the minimum number of transfers needed to settle all debts (greedy min-cash-flow algorithm).',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiOkResponse({
    description: 'Suggested transfers.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(SettlementSuggestionEntity) },
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Not a participant.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Trip not found.', type: ErrorResponseDto })
  async getSettlement(
    @CurrentUser() user: User,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    await this.tripsService.findOne(user.id, tripId);
    return this.balancesService.getSettlement(tripId);
  }
}
