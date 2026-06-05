import { Module } from '@nestjs/common';
import { ExpensesController } from './expense-details.controller';
import { MyExpensesController } from './my-expenses.controller';
import { ExpenseDetailsService } from './expense-details.service';
import { CurrencyModule } from '../currency/currency.module';
import { BalancesModule } from '../balances/balances.module';

@Module({
  imports: [CurrencyModule, BalancesModule],
  controllers: [ExpensesController, MyExpensesController],
  providers: [ExpenseDetailsService],
})
export class ExpenseDetailsModule {}
