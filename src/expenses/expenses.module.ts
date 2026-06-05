import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { CurrencyModule } from '../currency/currency.module';
import { BalancesModule } from '../balances/balances.module';

@Module({
  imports: [CurrencyModule, BalancesModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
