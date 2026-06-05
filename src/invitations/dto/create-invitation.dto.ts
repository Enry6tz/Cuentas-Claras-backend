import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'ID del usuario a invitar',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;
}
