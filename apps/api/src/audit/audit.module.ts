import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [
    AuditService,
    AuditInterceptor
  ],
  controllers: [AuditController],
  exports: [
    AuditService,
    AuditInterceptor
  ]
})
export class AuditModule {}
