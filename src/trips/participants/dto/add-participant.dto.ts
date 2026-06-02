import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class AddParticipantDto {
  @ApiProperty({
    description: 'ID del usuario a agregar',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
