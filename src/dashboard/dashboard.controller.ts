import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { DashboardService } from './dashboard.service';
import { DashboardEntity } from './entities/dashboard.entity';

@ApiTags('Dashboard')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Falta JWT, está vencido, o es inválido.',
  type: ErrorResponseDto,
})
@UseGuards(ClerkAuthGuard)
@Controller()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard del usuario',
    description:
      'Devuelve un resumen de los viajes del usuario, su balance total y actividad reciente.',
  })
  @ApiOkResponse({
    description: 'Dashboard data.',
    type: DashboardEntity,
  })
  getDashboard(@CurrentUser() user: User) {
    return this.dashboardService.getUserDashboard(user.id);
  }
}
