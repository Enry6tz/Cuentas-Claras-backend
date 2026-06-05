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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseEntity } from './entities/expense.entity';

@ApiTags('Expenses')
@ApiBearerAuth()
@ApiExtraModels(ExpenseEntity)
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.', type: ErrorResponseDto })
@UseGuards(ClerkAuthGuard)
@Controller('trips/:tripId/expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  @ApiOperation({
    summary: 'List expenses in a trip',
    description: 'Returns all non-deleted expenses for the trip, ordered by date descending.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiOkResponse({
    description: 'List of expenses.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ExpenseEntity) },
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
    return this.expensesService.findAll(user.id, tripId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an expense',
    description:
      'Creates a new expense with split between participants. Supports EQUAL/EXACT/PERCENT split types. Multi-currency with automatic exchange rate conversion.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiBody({ type: CreateExpenseDto })
  @ApiCreatedResponse({
    description: 'Expense created.',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(ExpenseEntity) },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid body (validation error, invalid split, or conversion failure).',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Not authorized to create expenses.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Trip or user not found.', type: ErrorResponseDto })
  create(
    @CurrentUser() user: User,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(user.id, tripId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get expense detail',
    description: 'Returns a single expense with all its details (per-participant breakdown).',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'Expense detail.',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(ExpenseEntity) },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Expense not found.', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Not a participant.', type: ErrorResponseDto })
  findOne(
    @CurrentUser() user: User,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expensesService.findOne(user.id, tripId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete (soft-delete) an expense',
    description:
      'Soft-deletes the expense. Only the expense creator or trip creator can delete. Triggers balance recalculation.',
  })
  @ApiParam({ name: 'tripId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Expense deleted.' })
  @ApiForbiddenResponse({ description: 'Not authorized to delete this expense.', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Expense not found.', type: ErrorResponseDto })
  async remove(
    @CurrentUser() user: User,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.expensesService.remove(user.id, tripId, id);
  }
}
