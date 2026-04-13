import { Module } from '@nestjs/common';
import { ExpensesController } from './expense-details.controller';

@Module({
  controllers: [ExpensesController],
})
export class ExpenseDetailsModule {}
