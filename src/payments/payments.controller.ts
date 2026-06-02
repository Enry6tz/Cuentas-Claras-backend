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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentEntity } from './entities/payment.entity';

@ApiTags('Payments')
@ApiBearerAuth()
@ApiExtraModels(PaymentEntity)
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.', type: ErrorResponseDto })
@UseGuards(ClerkAuthGuard)
@Controller('trips/:tripId/payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({
    summary: 'List payments in a trip',
    description: 'Returns all non-deleted payments for the trip, ordered by date descending.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiOkResponse({
    description: 'List of payments.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(PaymentEntity) },
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Not a participant.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Trip not found.', type: ErrorResponseDto })
  findAll(
    @CurrentUser() user: User,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.paymentsService.findAll(user.id, tripId);
  }

  @Post()
  @ApiOperation({
    summary: 'Record a payment',
    description:
      'Registers a transfer from debtor to creditor. Both must be trip participants. Triggers balance recalculation.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiCreatedResponse({
    description: 'Payment recorded.',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(PaymentEntity) },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid body (debtor=creditor, amount invalid, etc.).',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Not authorized to create payments.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Trip or participant not found.', type: ErrorResponseDto })
  create(
    @CurrentUser() user: User,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(user.id, tripId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete (soft-delete) a payment',
    description:
      'Soft-deletes the payment. Only the debtor or trip creator can delete. Triggers balance recalculation.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Payment deleted.' })
  @ApiForbiddenResponse({ description: 'Not authorized to delete this payment.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Payment not found.', type: ErrorResponseDto })
  async remove(
    @CurrentUser() user: User,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.paymentsService.remove(user.id, tripId, id);
  }
}
