import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ParticipationRole } from '@prisma/client';

export class ChangeRoleDto {
  @ApiProperty({
    enum: ParticipationRole,
    description: 'Nuevo rol (SUPERVISOR o MEMBER)',
  })
  @IsEnum(ParticipationRole)
  @IsNotEmpty()
  role: ParticipationRole;
}
