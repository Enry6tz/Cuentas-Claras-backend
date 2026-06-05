import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { MyPaymentsController } from './my-payments.controller';
import { PaymentsService } from './payments.service';
import { BalancesModule } from '../balances/balances.module';

@Module({
  imports: [BalancesModule],
  controllers: [PaymentsController, MyPaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
