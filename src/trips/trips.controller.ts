import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';

@ApiTags('Trips')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('trips')
export class TripsController {
  @Get()
  @ApiOperation({ summary: 'List user trips — NOT IMPLEMENTED' })
  findAll() {
    return { message: 'Not implemented yet' };
  }

  @Post()
  @ApiOperation({ summary: 'Create trip — NOT IMPLEMENTED' })
  create() {
    return { message: 'Not implemented yet' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip detail — NOT IMPLEMENTED' })
  findOne() {
    return { message: 'Not implemented yet' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update trip — NOT IMPLEMENTED' })
  update() {
    return { message: 'Not implemented yet' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete trip — NOT IMPLEMENTED' })
  remove() {
    return { message: 'Not implemented yet' };
  }
}
