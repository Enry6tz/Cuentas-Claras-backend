import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClerkJwtStrategy } from './strategies/clerk-jwt.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'clerk-jwt' })],
  controllers: [AuthController],
  providers: [AuthService, ClerkJwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
