import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { MastersService } from './masters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import {
  DepartmentDto,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DesignationDto,
  CreateDesignationRequest,
  UpdateDesignationRequest,
  BranchDto,
  CreateBranchRequest,
  UpdateBranchRequest,
  ShiftDto,
  CreateShiftRequest,
  UpdateShiftRequest,
  EmploymentTypeDto,
  CreateEmploymentTypeRequest,
  UpdateEmploymentTypeRequest,
  MasterBundleDto,
} from '@people-hub/shared-types';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

class CreateDepartmentDto implements CreateDepartmentRequest {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateDepartmentDto implements UpdateDepartmentRequest {
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
  @IsBoolean()
  isActive?: boolean;
}

class CreateDesignationDto implements CreateDesignationRequest {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateDesignationDto implements UpdateDesignationRequest {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateBranchDto implements CreateBranchRequest {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

class UpdateBranchDto implements UpdateBranchRequest {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateShiftDto implements CreateShiftRequest {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsNumber()
  breakMinutes?: number;
}

class UpdateShiftDto implements UpdateShiftRequest {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  breakMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateEmploymentTypeDto implements CreateEmploymentTypeRequest {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateEmploymentTypeDto implements UpdateEmploymentTypeRequest {
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
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('Master Data Management')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active Tenant ID context' })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller('masters')
export class MastersController {
  constructor(private mastersService: MastersService) {}

  @Get('bundle')
  @ApiOperation({ summary: 'Get all master tables in a single bundle for dropdowns' })
  @ApiResponse({ status: 200, description: 'Master bundle retrieved successfully' })
  async getBundle(@CurrentTenantId() tenantId: string): Promise<MasterBundleDto> {
    return this.mastersService.getMasterBundle(tenantId);
  }

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  @Get('departments')
  @ApiOperation({ summary: 'List all departments' })
  async listDepartments(@CurrentTenantId() tenantId: string): Promise<DepartmentDto[]> {
    return this.mastersService.listDepartments(tenantId);
  }

  @Post('departments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create department' })
  async createDepartment(@CurrentTenantId() tenantId: string, @Body() dto: CreateDepartmentDto): Promise<DepartmentDto> {
    return this.mastersService.createDepartment(tenantId, dto);
  }

  @Put('departments/:id')
  @ApiOperation({ summary: 'Update department' })
  async updateDepartment(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto
  ): Promise<DepartmentDto> {
    return this.mastersService.updateDepartment(tenantId, id, dto);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete department' })
  async deleteDepartment(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.mastersService.deleteDepartment(tenantId, id);
  }

  // ==========================================
  // DESIGNATIONS
  // ==========================================

  @Get('designations')
  @ApiOperation({ summary: 'List all designations' })
  async listDesignations(@CurrentTenantId() tenantId: string): Promise<DesignationDto[]> {
    return this.mastersService.listDesignations(tenantId);
  }

  @Post('designations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create designation' })
  async createDesignation(@CurrentTenantId() tenantId: string, @Body() dto: CreateDesignationDto): Promise<DesignationDto> {
    return this.mastersService.createDesignation(tenantId, dto);
  }

  @Put('designations/:id')
  @ApiOperation({ summary: 'Update designation' })
  async updateDesignation(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDesignationDto
  ): Promise<DesignationDto> {
    return this.mastersService.updateDesignation(tenantId, id, dto);
  }

  @Delete('designations/:id')
  @ApiOperation({ summary: 'Delete designation' })
  async deleteDesignation(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.mastersService.deleteDesignation(tenantId, id);
  }

  // ==========================================
  // BRANCHES & UNITS
  // ==========================================

  @Get('branches')
  @ApiOperation({ summary: 'List all branches and factory units' })
  async listBranches(@CurrentTenantId() tenantId: string): Promise<BranchDto[]> {
    return this.mastersService.listBranches(tenantId);
  }

  @Post('branches')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create branch or factory unit' })
  async createBranch(@CurrentTenantId() tenantId: string, @Body() dto: CreateBranchDto): Promise<BranchDto> {
    return this.mastersService.createBranch(tenantId, dto);
  }

  @Put('branches/:id')
  @ApiOperation({ summary: 'Update branch or unit' })
  async updateBranch(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto
  ): Promise<BranchDto> {
    return this.mastersService.updateBranch(tenantId, id, dto);
  }

  @Delete('branches/:id')
  @ApiOperation({ summary: 'Delete branch or unit' })
  async deleteBranch(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.mastersService.deleteBranch(tenantId, id);
  }

  // ==========================================
  // SHIFTS
  // ==========================================

  @Get('shifts')
  @ApiOperation({ summary: 'List all work shifts' })
  async listShifts(@CurrentTenantId() tenantId: string): Promise<ShiftDto[]> {
    return this.mastersService.listShifts(tenantId);
  }

  @Post('shifts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create shift' })
  async createShift(@CurrentTenantId() tenantId: string, @Body() dto: CreateShiftDto): Promise<ShiftDto> {
    return this.mastersService.createShift(tenantId, dto);
  }

  @Put('shifts/:id')
  @ApiOperation({ summary: 'Update shift' })
  async updateShift(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto
  ): Promise<ShiftDto> {
    return this.mastersService.updateShift(tenantId, id, dto);
  }

  @Delete('shifts/:id')
  @ApiOperation({ summary: 'Delete shift' })
  async deleteShift(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.mastersService.deleteShift(tenantId, id);
  }

  // ==========================================
  // EMPLOYMENT TYPES
  // ==========================================

  @Get('employment-types')
  @ApiOperation({ summary: 'List all employment categories' })
  async listEmploymentTypes(@CurrentTenantId() tenantId: string): Promise<EmploymentTypeDto[]> {
    return this.mastersService.listEmploymentTypes(tenantId);
  }

  @Post('employment-types')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create employment category' })
  async createEmploymentType(
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateEmploymentTypeDto
  ): Promise<EmploymentTypeDto> {
    return this.mastersService.createEmploymentType(tenantId, dto);
  }

  @Put('employment-types/:id')
  @ApiOperation({ summary: 'Update employment category' })
  async updateEmploymentType(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmploymentTypeDto
  ): Promise<EmploymentTypeDto> {
    return this.mastersService.updateEmploymentType(tenantId, id, dto);
  }

  @Delete('employment-types/:id')
  @ApiOperation({ summary: 'Delete employment category' })
  async deleteEmploymentType(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.mastersService.deleteEmploymentType(tenantId, id);
  }
}
