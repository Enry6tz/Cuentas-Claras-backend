import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrencyService } from './currency.service';

@ApiTags('Currency')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
@UseGuards(ClerkAuthGuard)
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('rate')
  @ApiOperation({
    summary: 'Get current exchange rate',
    description:
      'Fetches the current exchange rate between two currencies. Results are cached for the configured TTL (default 1 hour).',
  })
  @ApiQuery({
    name: 'from',
    required: true,
    example: 'USD',
    description: 'Source currency code (ISO 4217)',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    example: 'ARS',
    description: 'Target currency code (ISO 4217)',
  })
  @ApiOkResponse({
    description: 'Exchange rate information.',
    schema: {
      properties: {
        data: {
          type: 'object',
          properties: {
            from: { type: 'string', example: 'USD' },
            to: { type: 'string', example: 'ARS' },
            rate: { type: 'number', example: 1200.5 },
          },
        },
      },
    },
  })
  async getRate(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const rate = await this.currencyService.getRate(
      from.toUpperCase(),
      to.toUpperCase(),
    );
    return {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
    };
  }
}
