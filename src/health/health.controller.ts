import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Root — basic status' })
  root() {
    return { status: 'ok', service: 'Cuentas Claras API' };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check — ping backend + Supabase DB' })
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
