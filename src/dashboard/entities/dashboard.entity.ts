import { ApiProperty } from '@nestjs/swagger';

export class ActivityItemEntity {
  @ApiProperty({ enum: ['expense', 'payment', 'trip'] })
  type: string;

  @ApiProperty({ type: String, nullable: true, required: false })
  description: string | null;

  @ApiProperty({ example: '45.00' })
  amount: string;

  @ApiProperty()
  tripName: string;

  @ApiProperty()
  tripId: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-06-06T14:30:00.000Z',
    description: 'Fecha del item de actividad en ISO 8601 UTC.',
  })
  date: string;
}

export class DashboardEntity {
  @ApiProperty({ example: 3 })
  activeTrips: number;

  @ApiProperty({ example: 5 })
  totalTrips: number;

  @ApiProperty({ example: '0.00', description: 'Balance neto del usuario en todos sus viajes (suma de currentBalance)' })
  balanceTotal: string;

  @ApiProperty({ example: '0.00', description: 'Total gastado por el usuario (suma de amountPaid en todos sus viajes)' })
  totalGastado: string;

  @ApiProperty({ example: '0.00', description: 'Total recibido por el usuario via pagos (suma de pagos como acreedor)' })
  totalEnPagos: string;

  @ApiProperty({ type: [ActivityItemEntity] })
  recentActivity: ActivityItemEntity[];
}
