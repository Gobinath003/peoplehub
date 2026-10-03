import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { PieceRateService } from './piece-rate.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import { 
  CreatePieceRateActivityRequest, 
  CreatePieceRateLogRequest, 
  PieceRateActivityDto, 
  PieceRateLogDto,
  PieceRateEmployeeSummaryDto 
} from '@people-hub/shared-types';

import { IsString, IsNumber, IsOptional } from 'class-validator';

class CreateActivityDto implements CreatePieceRateActivityRequest {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  ratePerUnit!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

class CreateLogDto implements CreatePieceRateLogRequest {
  @IsString()
  employeeId!: string;

  @IsString()
  activityId!: string;

  @IsString()
  logDate!: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsNumber()
  unitRate?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

@ApiTags('Piece-Rate Production (Garments)')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active Tenant ID context' })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller('piece-rate')
export class PieceRateController {
  constructor(private pieceRateService: PieceRateService) {}

  @Get('activities')
  @ApiOperation({ summary: 'List all garment piece-rate operations/skills' })
  @ApiResponse({ status: 200, description: 'Activities retrieved successfully' })
  async listActivities(@CurrentTenantId() tenantId: string): Promise<PieceRateActivityDto[]> {
    return this.pieceRateService.listActivities(tenantId);
  }

  @Post('activities')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new garment operation or skill rate' })
  @ApiResponse({ status: 201, description: 'Activity created successfully' })
  async createActivity(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateActivityDto
  ): Promise<PieceRateActivityDto> {
    return this.pieceRateService.createActivity(tenantId, dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'List daily piece-rate production logs' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  async listLogs(
    @CurrentTenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('activityId') activityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<PieceRateLogDto[]> {
    return this.pieceRateService.listLogs(tenantId, { employeeId, activityId, startDate, endDate });
  }

  @Post('logs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record daily piece-rate activity entry for an employee' })
  @ApiResponse({ status: 201, description: 'Daily log recorded successfully' })
  async createLog(
    @CurrentTenantId() tenantId: string,
    @Request() req: any,
    @Body() dto: CreateLogDto
  ): Promise<PieceRateLogDto> {
    const recordedBy = req.user?.id;
    return this.pieceRateService.createLog(tenantId, dto, recordedBy);
  }

  @Delete('logs/:id')
  @ApiOperation({ summary: 'Delete a daily production log entry' })
  @ApiResponse({ status: 200, description: 'Log deleted successfully' })
  async deleteLog(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string
  ) {
    return this.pieceRateService.deleteLog(tenantId, id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get monthly piece-rate summary aggregated by worker' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getSummary(
    @CurrentTenantId() tenantId: string,
    @Query('month') month: number,
    @Query('year') year: number
  ): Promise<PieceRateEmployeeSummaryDto[]> {
    return this.pieceRateService.getMonthlyEmployeeSummary(tenantId, Number(month), Number(year));
  }
}
