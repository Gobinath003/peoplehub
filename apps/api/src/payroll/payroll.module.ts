import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [PayrollService],
  controllers: [PayrollController],
  exports: [PayrollService]
})
export class PayrollModule {}
