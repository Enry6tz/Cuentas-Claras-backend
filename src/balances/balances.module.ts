import { Module } from '@nestjs/common';
import { BalancesController } from './balances.controller';
import { BalancesService } from './balances.service';
import { TripsModule } from '../trips/trips.module';

@Module({
  imports: [TripsModule],
  controllers: [BalancesController],
  providers: [BalancesService],
  exports: [BalancesService],
})
export class BalancesModule {}
