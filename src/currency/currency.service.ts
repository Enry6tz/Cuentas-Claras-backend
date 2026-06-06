import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';

interface CacheEntry {
  rate: number;
  timestamp: number;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private cache = new Map<string, CacheEntry>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async convert(
    originalAmount: number,
    originalCurrency: string,
    baseCurrency: string,
    manualRate?: number,
  ): Promise<{ exchangeRate: number; baseAmount: number }> {
    if (originalCurrency === baseCurrency) {
      return { exchangeRate: 1, baseAmount: originalAmount };
    }

    let exchangeRate: number;

    if (manualRate !== undefined && manualRate > 0) {
      exchangeRate = manualRate;
    } else {
      exchangeRate = await this.getRate(originalCurrency, baseCurrency);
    }

    const baseAmount = Math.round(originalAmount * exchangeRate * 100) / 100;

    return { exchangeRate, baseAmount };
  }

  async getRate(from: string, to: string): Promise<number> {
    const key = `${from}_${to}`;
    const cached = this.cache.get(key);
    const ttl = this.configService.get<number>('exchangeRate.cacheTtlMs') ?? 3600000;

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.rate;
    }

    const rate = await this.fetchRate(from, to);

    this.cache.set(key, { rate, timestamp: Date.now() });

    return rate;
  }

  private async fetchRate(from: string, to: string): Promise<number> {
    const apiKey = this.configService.get<string>('exchangeRate.apiKey');
    const baseUrl =
      this.configService.get<string>('exchangeRate.baseUrl') ??
      'https://v6.exchangerate-api.com/v6';

    if (!apiKey) {
      throw new BadRequestException({
        code: 'EXCHANGE_RATE_NOT_CONFIGURED',
        message:
          'Exchange rate API key is not configured. Provide a manual exchange rate or set EXCHANGE_RATE_API_KEY.',
      });
    }

    const url = `${baseUrl}/${apiKey}/pair/${from}/${to}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<{
          result: string;
          conversion_rate: number;
        }>(url).pipe(
          catchError((error) => {
            this.logger.error(
              `Exchange rate API error: ${error.message}`,
            );
            throw new BadRequestException({
              code: 'EXCHANGE_RATE_FETCH_FAILED',
              message: `Failed to fetch exchange rate from ${from} to ${to}. Please provide a manual rate or try again later.`,
            });
          }),
        ),
      );

      if (data.result !== 'success' || !data.conversion_rate) {
        throw new BadRequestException({
          code: 'EXCHANGE_RATE_UNAVAILABLE',
          message: `Exchange rate API returned an error for ${from} -> ${to}. Provide a manual rate.`,
        });
      }

      return data.conversion_rate;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException({
        code: 'CURRENCY_CONVERSION_FAILED',
        message: `Failed to convert from ${from} to ${to}. Provide a manual rate.`,
      });
    }
  }
}
