import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { 
  PermissionCode, 
  ScopeType, 
  UpsertSalaryStructureRequest, 
  GeneratePayslipRequest, 
  CreateHourlyWorkLogRequest,
  HourlyWorkLogDto,
  PayslipDto 
} from '@people-hub/shared-types';

import { IsNumber, IsString, IsOptional } from 'class-validator';

class UpsertSalaryStructureDto implements UpsertSalaryStructureRequest {
  @IsNumber()
  basicSalary!: number;

  @IsOptional()
  @IsNumber()
  hra?: number;

  @IsOptional()
  @IsNumber()
  specialAllowance?: number;

  @IsOptional()
  @IsNumber()
  conveyanceAllowance?: number;

  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @IsOptional()
  @IsNumber()
  dailyRate?: number;

  @IsOptional()
  @IsNumber()
  standardHours?: number;

  @IsOptional()
  @IsNumber()
  overtimeMultiplier?: number;

  @IsOptional()
  @IsNumber()
  pfDeduction?: number;

  @IsOptional()
  @IsNumber()
  taxDeduction?: number;

  @IsOptional()
  @IsNumber()
  otherDeductions?: number;
}

class GeneratePayslipDto implements GeneratePayslipRequest {
  @IsNumber()
  month!: number;

  @IsNumber()
  year!: number;

  @IsString()
  payPeriod!: string;

  @IsOptional()
  @IsString()
  cycleType?: 'MONTHLY' | 'WEEKLY';

  @IsOptional()
  @IsNumber()
  weekNumber?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsNumber()
  workingDays?: number;
}

class CreateHourlyWorkLogDto implements CreateHourlyWorkLogRequest {
  @IsString()
  employeeId!: string;

  @IsString()
  logDate!: string;

  @IsNumber()
  regularHours!: number;

  @IsOptional()
  @IsNumber()
  overtimeHours?: number;

  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @IsOptional()
  @IsNumber()
  overtimeMultiplier?: number;

  @IsOptional()
  @IsString()
  projectOrTask?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

@ApiTags('Payroll & Payslips')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active Tenant ID context' })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @Get('structures')
  @RequirePermissions(PermissionCode.PAYROLL_VIEW)
  @ApiOperation({ summary: 'List all employee compensation structures' })
  @ApiResponse({ status: 200, description: 'Salary structures retrieved successfully' })
  async listStructures(
    @CurrentTenantId() tenantId: string,
    @Request() req: any
  ) {
    const branchRole = req.user?.roles?.find((r: any) => r.scopeType === ScopeType.BRANCH);
    const branchScope = branchRole ? branchRole.scopeId : null;

    return this.payrollService.listStructures(tenantId, branchScope);
  }

  @Post('structures/:employeeId')
  @RequirePermissions(PermissionCode.PAYROLL_PROCESS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure or update an employee salary structure' })
  @ApiResponse({ status: 200, description: 'Salary structure updated successfully' })
  async upsertStructure(
    @CurrentTenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpsertSalaryStructureDto
  ) {
    return this.payrollService.upsertStructure(tenantId, employeeId, dto);
  }

  @Get('payslips')
  @RequirePermissions(PermissionCode.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Get generated payslips history with filters' })
  @ApiResponse({ status: 200, description: 'Payslips retrieved successfully' })
  async listPayslips(
    @CurrentTenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('month') month?: number,
    @Query('year') year?: number
  ): Promise<PayslipDto[]> {
    return this.payrollService.listPayslips(tenantId, { employeeId, month, year });
  }

  @Get('payslips/:id')
  @RequirePermissions(PermissionCode.PAYROLL_VIEW)
  @ApiOperation({ summary: 'Get detailed payslip record for printing / viewing' })
  @ApiResponse({ status: 200, description: 'Payslip details retrieved successfully' })
  async getPayslip(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string
  ): Promise<PayslipDto> {
    return this.payrollService.getPayslipById(tenantId, id);
  }

  @Post('payslips/generate')
  @RequirePermissions(PermissionCode.PAYROLL_PROCESS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Run payroll & generate payslips for active employees' })
  @ApiResponse({ status: 201, description: 'Payslips generated successfully' })
  async generatePayslips(
    @CurrentTenantId() tenantId: string,
    @Body() dto: GeneratePayslipDto
  ) {
    return this.payrollService.generatePayslips(tenantId, dto);
  }

  @Get('hourly-logs')
  @RequirePermissions(PermissionCode.PAYROLL_VIEW)
  @ApiOperation({ summary: 'List hourly work logs for hourly-paid workforce' })
  async listHourlyLogs(
    @CurrentTenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<HourlyWorkLogDto[]> {
    return this.payrollService.listHourlyLogs(tenantId, { employeeId, startDate, endDate });
  }

  @Post('hourly-logs')
  @RequirePermissions(PermissionCode.PAYROLL_PROCESS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record daily work hours and overtime for an employee' })
  async createHourlyLog(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateHourlyWorkLogDto
  ): Promise<HourlyWorkLogDto> {
    return this.payrollService.createHourlyLog(tenantId, user?.userId || user?.id, dto);
  }

  @Delete('hourly-logs/:id')
  @RequirePermissions(PermissionCode.PAYROLL_PROCESS)
  @ApiOperation({ summary: 'Delete an hourly work log entry' })
  async deleteHourlyLog(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string
  ) {
    return this.payrollService.deleteHourlyLog(tenantId, id);
  }
}
