import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('trips/:tripId/expenses')
export class ExpensesController {
  @Get()
  @ApiOperation({ summary: 'List expenses in trip — NOT IMPLEMENTED' })
  findAll() {
    return { message: 'Not implemented yet' };
  }

  @Post()
  @ApiOperation({ summary: 'Create expense — NOT IMPLEMENTED' })
  create() {
    return { message: 'Not implemented yet' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense detail — NOT IMPLEMENTED' })
  findOne() {
    return { message: 'Not implemented yet' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete expense — NOT IMPLEMENTED' })
  remove() {
    return { message: 'Not implemented yet' };
  }
}
