import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClerkApiService } from './clerk-api.service';
import { ClerkJwtStrategy } from './strategies/clerk-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'clerk-jwt' }),
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, ClerkApiService, ClerkJwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
