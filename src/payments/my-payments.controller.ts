import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { PaymentsService } from './payments.service';
import { PaymentEntity } from './entities/payment.entity';
import { QueryMyPaymentsDto } from './dto/query-my-payments.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@ApiExtraModels(PaymentEntity)
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.', type: ErrorResponseDto })
@UseGuards(ClerkAuthGuard)
@Controller('me/payments')
export class MyPaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({
    summary: 'List the current user payments across all their trips',
    description:
      'Paginated list of payments from all trips where the user participates. Supports filters: tripId, role (debtor/creditor), q (note), from, to.',
  })
  @ApiOkResponse({
    description: 'Paginated list of payments.',
    schema: {
      properties: {
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: getSchemaPath(PaymentEntity) },
            },
            total: { type: 'number', example: 42 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            hasMore: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  findMine(@CurrentUser() user: User, @Query() query: QueryMyPaymentsDto) {
    return this.paymentsService.findAllForUser(user.id, query);
  }
}
