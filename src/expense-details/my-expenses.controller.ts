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
import { ExpenseDetailsService } from './expense-details.service';
import { ExpenseEntity } from './entities/expense.entity';
import { QueryMyExpensesDto } from './dto/query-my-expenses.dto';

@ApiTags('Expenses')
@ApiBearerAuth()
@ApiExtraModels(ExpenseEntity)
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.', type: ErrorResponseDto })
@UseGuards(ClerkAuthGuard)
@Controller('me/expenses')
export class MyExpensesController {
  constructor(private expenseDetailsService: ExpenseDetailsService) {}

  @Get()
  @ApiOperation({
    summary: 'List the current user expenses across all their trips',
    description:
      'Paginated list of expenses from all trips where the user participates. Supports filters: tripId, category, q (description), from, to.',
  })
  @ApiOkResponse({
    description: 'Paginated list of expenses.',
    schema: {
      properties: {
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: getSchemaPath(ExpenseEntity) },
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
  findMine(@CurrentUser() user: User, @Query() query: QueryMyExpensesDto) {
    return this.expenseDetailsService.findAllForUser(user.id, query);
  }
}
