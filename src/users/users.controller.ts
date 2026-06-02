import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { User } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Falta JWT, está vencido, o es inválido.',
  type: ErrorResponseDto,
})
@UseGuards(ClerkAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Devuelve el perfil del usuario autenticado.',
  })
  @ApiOkResponse({ description: 'User profile.' })
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Actualiza el perfil del usuario autenticado. Por ahora solo permite cambiar el nombre.',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ description: 'Profile updated.' })
  @ApiBadRequestResponse({
    description: 'Body inválido.',
    type: ErrorResponseDto,
  })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search users by email',
    description: 'Busca usuarios registrados por email. Case-insensitive, máximo 10 resultados.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Término de búsqueda (email)',
  })
  @ApiOkResponse({ description: 'Lista de usuarios encontrados.' })
  search(@Query('q') query: string) {
    return this.usersService.searchByEmail(query || '');
  }
}
