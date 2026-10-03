import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import { 
  PermissionCode, 
  ScopeType, 
  EmployeeDto, 
  CreateEmployeeRequest, 
  UpdateEmployeeRequest 
} from '@people-hub/shared-types';

import { IsString, IsOptional, IsNumber } from 'class-validator';

class CreateEmployeeDto implements CreateEmployeeRequest {
  @IsString()
  employeeCode!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  designationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsString()
  employmentTypeId?: string;

  @IsOptional()
  @IsString()
  salaryType?: string;

  @IsString()
  joiningDate!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  basicSalary?: number;

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
  pfDeduction?: number;

  @IsOptional()
  @IsNumber()
  taxDeduction?: number;
}

class UpdateEmployeeDto implements UpdateEmployeeRequest {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  designationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsString()
  employmentTypeId?: string;

  @IsOptional()
  @IsString()
  salaryType?: string;

  @IsOptional()
  @IsString()
  joiningDate?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

@ApiTags('Employees')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active Tenant ID context' })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  @RequirePermissions(PermissionCode.EMPLOYEE_VIEW)
  @ApiOperation({ summary: 'List employees in active company (respecting branch scope)' })
  @ApiResponse({ status: 200, description: 'Employees retrieved successfully' })
  async listEmployees(
    @CurrentTenantId() tenantId: string,
    @Request() req: any
  ): Promise<EmployeeDto[]> {
    // Check if user has a branch scope restriction
    const branchRole = req.user?.roles?.find((r: any) => r.scopeType === ScopeType.BRANCH);
    const branchScope = branchRole ? branchRole.scopeId : null;

    return this.employeesService.list(tenantId, branchScope);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.EMPLOYEE_VIEW)
  @ApiOperation({ summary: 'Get employee by ID with compensation and recent history' })
  @ApiResponse({ status: 200, description: 'Employee retrieved successfully' })
  async getEmployee(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string
  ): Promise<EmployeeDto> {
    return this.employeesService.getById(tenantId, id);
  }

  @Post()
  @RequirePermissions(PermissionCode.EMPLOYEE_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new employee to active company' })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  async createEmployee(
    @CurrentTenantId() tenantId: string,
    @Request() req: any,
    @Body() dto: CreateEmployeeDto
  ): Promise<EmployeeDto> {
    // If user has branch scope, default/force branch
    const branchRole = req.user?.roles?.find((r: any) => r.scopeType === ScopeType.BRANCH);
    if (branchRole && branchRole.scopeId) {
      dto.branch = branchRole.scopeId;
    }

    return this.employeesService.create(tenantId, dto);
  }

  @Put(':id')
  @RequirePermissions(PermissionCode.EMPLOYEE_EDIT)
  @ApiOperation({ summary: 'Update employee details' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  async updateEmployee(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto
  ): Promise<EmployeeDto> {
    return this.employeesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.EMPLOYEE_DELETE)
  @ApiOperation({ summary: 'Delete or remove employee record' })
  @ApiResponse({ status: 200, description: 'Employee deleted successfully' })
  async deleteEmployee(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string
  ) {
    return this.employeesService.delete(tenantId, id);
  }
}
