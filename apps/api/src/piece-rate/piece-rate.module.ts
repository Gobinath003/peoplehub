import { Module } from '@nestjs/common';
import { PieceRateService } from './piece-rate.service';
import { PieceRateController } from './piece-rate.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [PieceRateService],
  controllers: [PieceRateController],
  exports: [PieceRateService]
})
export class PieceRateModule {}
