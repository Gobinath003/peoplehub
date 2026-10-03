import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TenantGuard } from './tenant.guard';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'super-secret-jwt-access-key-change-in-production'),
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRY', '15m') },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtAuthGuard,
    TenantGuard,
    PermissionGuard
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    JwtModule,
    JwtAuthGuard,
    TenantGuard,
    PermissionGuard
  ],
})
export class AuthModule {}
