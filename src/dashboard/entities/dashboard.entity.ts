import { ApiProperty } from '@nestjs/swagger';

export class ActivityItemEntity {
  @ApiProperty({ enum: ['expense', 'payment', 'trip'] })
  type: string;

  @ApiProperty({ nullable: true, required: false })
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

  @ApiProperty({ example: '0.00', description: 'Balance total (placeholder hasta que Grupo B implemente recálculo)' })
  balanceTotal: string;

  @ApiProperty({ type: [ActivityItemEntity] })
  recentActivity: ActivityItemEntity[];
}
