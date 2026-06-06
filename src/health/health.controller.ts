import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Root — basic status' })
  @ApiOkResponse({
    description: 'El servicio está arriba.',
    schema: {
      example: { status: 'ok', service: 'Cuentas Claras API' },
    },
  })
  root() {
    return { status: 'ok', service: 'Cuentas Claras API' };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check — ping backend + Supabase DB' })
  @ApiOkResponse({
    description: 'Backend y base de datos respondiendo.',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-06-06T14:30:00.000Z',
        db: { status: 'ok', responseTime: '12ms' },
      },
    },
  })
  async check() {
    const start = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    const dbMs = Date.now() - start;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: { status: 'ok', responseTime: `${dbMs}ms` },
    };
  }
}
