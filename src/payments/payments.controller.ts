import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('trips/:tripId/payments')
export class PaymentsController {
  @Get()
  @ApiOperation({ summary: 'List payments in trip — NOT IMPLEMENTED' })
  findAll() {
    return { message: 'Not implemented yet' };
  }

  @Post()
  @ApiOperation({ summary: 'Record payment — NOT IMPLEMENTED' })
  create() {
    return { message: 'Not implemented yet' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment — NOT IMPLEMENTED' })
  remove() {
    return { message: 'Not implemented yet' };
  }
}
