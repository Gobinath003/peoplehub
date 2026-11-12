import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CreateLeaveTypeRequest,
  UpdateLeaveTypeRequest,
  AdjustLeaveBalanceRequest,
  ApplyLeaveRequest,
  ActionLeaveRequest,
  LeaveAccrualType,
  HalfDaySession,
} from '@people-hub/shared-types';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
} from 'class-validator';

class CreateLeaveTypeDto implements CreateLeaveTypeRequest {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  annualQuota!: number;

  @IsOptional()
  @IsString()
  accrualType?: LeaveAccrualType;

  @IsOptional()
  @IsNumber()
  carryForwardLimit?: number;

  @IsOptional()
  @IsInt()
  maxConsecutiveDays?: number | null;

  @IsOptional()
  @IsInt()
  minNoticeDays?: number;

  @IsOptional()
  @IsBoolean()
  allowHalfDay?: boolean;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsString()
  applicableGender?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

class UpdateLeaveTypeDto implements UpdateLeaveTypeRequest {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  annualQuota?: number;

  @IsOptional()
  @IsString()
  accrualType?: LeaveAccrualType;

  @IsOptional()
  @IsNumber()
  carryForwardLimit?: number;

  @IsOptional()
  @IsInt()
  maxConsecutiveDays?: number | null;

  @IsOptional()
  @IsInt()
  minNoticeDays?: number;

  @IsOptional()
  @IsBoolean()
  allowHalfDay?: boolean;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsString()
  applicableGender?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  syncExistingBalances?: boolean;
}

class SyncLeaveBalancesDto {
  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsBoolean()
  overwriteAllocated?: boolean;
}

class AdjustLeaveBalanceDto implements AdjustLeaveBalanceRequest {
  @IsString()
  employeeId!: string;

  @IsString()
  leaveTypeId!: string;

  @IsInt()
  year!: number;

  @IsOptional()
  @IsNumber()
  allocated?: number;

  @IsOptional()
  @IsNumber()
  carryForward?: number;
}

class ApplyLeaveDto implements ApplyLeaveRequest {
  @IsString()
  leaveTypeId!: string;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @IsOptional()
  @IsBoolean()
  isHalfDay?: boolean;

  @IsOptional()
  @IsString()
  halfDaySession?: HalfDaySession;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  handoverNotes?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

class ActionLeaveDto implements ActionLeaveRequest {
  @IsOptional()
  @IsString()
  remarks?: string;
}

class LinkProfileDto {
  @IsOptional()
  @IsString()
  employeeId?: string;
}

@ApiTags('Leave Management')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true })
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('leave')
export class LeaveController {
  constructor(private leaveService: LeaveService) {}

  @Get('workspace')
  @ApiOperation({ summary: 'Get unified Leave Management workspace summary (balances, my leaves, team approvals, types)' })
  async getWorkspace(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('year') year?: string
  ) {
    return this.leaveService.getWorkspaceSummary(tenantId, user, year ? Number(year) : undefined);
  }

  @Get('types')
  @ApiOperation({ summary: 'List leave type masters for active tenant' })
  async listLeaveTypes(
    @CurrentTenantId() tenantId: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    return this.leaveService.listLeaveTypes(tenantId, includeInactive !== 'false');
  }

  @Post('types')
  @ApiOperation({ summary: 'Create a leave type master (Tenant Admin / HR)' })
  async createLeaveType(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateLeaveTypeDto
  ) {
    return this.leaveService.createLeaveType(tenantId, user, dto);
  }

  @Put('types/:id')
  @ApiOperation({ summary: 'Update leave type master details / annual quota' })
  async updateLeaveType(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveTypeDto
  ) {
    return this.leaveService.updateLeaveType(tenantId, user, id, dto);
  }

  @Delete('types/:id')
  @ApiOperation({ summary: 'Delete or deactivate a leave type master' })
  async deleteLeaveType(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string
  ) {
    return this.leaveService.deleteLeaveType(tenantId, user, id);
  }

  @Get('balances')
  @ApiOperation({ summary: 'List employee leave balances for a given year' })
  async listBalances(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('year') year?: string,
    @Query('employeeId') employeeId?: string
  ) {
    return this.leaveService.listBalances(tenantId, user, year ? Number(year) : undefined, employeeId);
  }

  @Post('balances/sync')
  @ApiOperation({ summary: 'Sync/initialize leave balances for all active employees' })
  async syncBalances(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: SyncLeaveBalancesDto
  ) {
    return this.leaveService.syncYearBalances(tenantId, user, dto.year, Boolean(dto.overwriteAllocated));
  }

  @Post('balances/adjust')
  @ApiOperation({ summary: 'Adjust an individual employee leave balance quota or carry forward' })
  async adjustBalance(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: AdjustLeaveBalanceDto
  ) {
    return this.leaveService.adjustBalance(tenantId, user, dto);
  }

  @Get('requests')
  @ApiOperation({ summary: 'List leave requests scoped to user or organization' })
  async listRequests(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('scope') scope?: string
  ) {
    return this.leaveService.listRequests(tenantId, user, scope || 'all');
  }

  @Post('requests')
  @ApiOperation({ summary: 'Apply for leave and route to Reporting Manager' })
  async applyLeave(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: ApplyLeaveDto
  ) {
    return this.leaveService.applyLeave(tenantId, user, dto);
  }

  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve a pending leave request (Reporting Manager / HR)' })
  async approveLeave(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ActionLeaveDto
  ) {
    return this.leaveService.approveLeave(tenantId, user, id, dto);
  }

  @Post('requests/:id/reject')
  @ApiOperation({ summary: 'Reject a pending leave request (Reporting Manager / HR)' })
  async rejectLeave(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ActionLeaveDto
  ) {
    return this.leaveService.rejectLeave(tenantId, user, id, dto);
  }

  @Post('requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel an applied leave request and refund balance' })
  async cancelLeave(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string
  ) {
    return this.leaveService.cancelLeave(tenantId, user, id);
  }

  @Post('admin/link-profile')
  @ApiOperation({ summary: 'Link logged-in admin account to an employee profile for self-service leave testing' })
  async linkProfile(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: LinkProfileDto
  ) {
    return this.leaveService.linkEmployeeProfile(tenantId, user, dto.employeeId);
  }
}
