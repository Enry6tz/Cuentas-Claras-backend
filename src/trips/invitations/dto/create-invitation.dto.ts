import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { ParticipationRole } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'ID del usuario registrado al que se invita',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    enum: ParticipationRole,
    description: 'Rol que tendrá la persona en el viaje (MEMBER o SUPERVISOR)',
    example: ParticipationRole.MEMBER,
  })
  @IsEnum(ParticipationRole)
  @IsNotEmpty()
  role: ParticipationRole;
}
