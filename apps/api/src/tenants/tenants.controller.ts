import { Controller, Get, Post, Put, Body, Param, UseGuards, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { 
  PermissionCode, 
  TenantModuleResponse, 
  CreateTenantWithAdminRequest, 
  UpdateTenantModulesRequest,
  UpdateTenantSalaryTypesRequest,
  SalaryType,
  IndustryType 
} from '@people-hub/shared-types';

import { IsString, IsBoolean, IsOptional, IsArray, IsIn, ArrayMinSize } from 'class-validator';

class UpdateModuleStateDto {
  @IsBoolean()
  isEnabled!: boolean;
}

class UpdateTenantModulesDto implements UpdateTenantModulesRequest {
  @IsArray()
  @IsString({ each: true })
  enabledModules!: string[];
}

class UpdateTenantSalaryTypesDto implements UpdateTenantSalaryTypesRequest {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsIn(Object.values(SalaryType), { each: true })
  enabledSalaryTypes!: string[];
}

class CreateTenantDto implements CreateTenantWithAdminRequest {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  industry!: IndustryType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  registrationNo?: string;

  @IsString()
  adminEmail!: string;

  @IsOptional()
  @IsString()
  adminPassword!: string;

  @IsString()
  adminFirstName!: string;

  @IsString()
  adminLastName!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(Object.values(SalaryType), { each: true })
  enabledSalaryTypes?: string[];
}

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all companies/tenants in the platform (Super Admin)' })
  @ApiResponse({ status: 200, description: 'All companies retrieved successfully' })
  async listAllTenants(@CurrentUser() user: any) {
    if (user?.email !== 'admin@peoplehub.com') {
      throw new ForbiddenException('Only platform Super Admin can list all platform tenants');
    }
    return this.tenantsService.listAllTenants();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Company Tenant and provision initial HR Manager (Super Admin)' })
  @ApiResponse({ status: 201, description: 'Company Tenant and Manager created successfully' })
  async createTenant(@CurrentUser() user: any, @Body() dto: CreateTenantDto) {
    if (user?.email !== 'admin@peoplehub.com') {
      throw new ForbiddenException('Only platform Super Admin can create new tenants');
    }
    return this.tenantsService.createTenantWithAdmin(dto);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active Tenant ID context' })
  @RequirePermissions(PermissionCode.TENANT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'Get current active tenant details' })
  @ApiResponse({ status: 200, description: 'Tenant details retrieved' })
  async getActiveTenant(@CurrentTenantId() tenantId: string) {
    return this.tenantsService.getTenant(tenantId);
  }

  @Get('modules')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active Tenant ID context' })
  @RequirePermissions(PermissionCode.TENANT_SETTINGS_VIEW)
  @ApiOperation({ summary: 'Get list of modules registered for active tenant' })
  @ApiResponse({ status: 200, description: 'Tenant modules retrieved' })
  async getTenantModules(@CurrentTenantId() tenantId: string): Promise<TenantModuleResponse[]> {
    return this.tenantsService.getTenantModules(tenantId);
  }

  @Post('modules/:code')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active Tenant ID context' })
  @RequirePermissions(PermissionCode.MODULE_MANAGE)
  @ApiOperation({ summary: 'Enable or disable a specific tenant module' })
  @ApiResponse({ status: 200, description: 'Module state updated successfully' })
  async updateModuleState(
    @CurrentTenantId() tenantId: string,
    @Param('code') moduleCode: string,
    @Body() dto: UpdateModuleStateDto
  ) {
    return this.tenantsService.updateModuleState(tenantId, moduleCode, dto.isEnabled);
  }

  @Get(':id/modules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get configured module visibility for any tenant (Super Admin)' })
  async getTenantModulesAdmin(
    @CurrentUser() user: any,
    @Param('id') targetTenantId: string
  ): Promise<TenantModuleResponse[]> {
    if (user?.email !== 'admin@peoplehub.com') {
      throw new ForbiddenException('Only platform Super Admin can inspect any tenant modules');
    }
    return this.tenantsService.getTenantModules(targetTenantId);
  }

  @Put(':id/modules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update enabled modules for any tenant (Super Admin)' })
  async updateTenantModulesAdmin(
    @CurrentUser() user: any,
    @Param('id') targetTenantId: string,
    @Body() dto: UpdateTenantModulesDto
  ): Promise<TenantModuleResponse[]> {
    if (user?.email !== 'admin@peoplehub.com') {
      throw new ForbiddenException('Only platform Super Admin can configure tenant modules');
    }
    return this.tenantsService.updateTenantModulesBulk(targetTenantId, dto.enabledModules);
  }

  @Get('salary-types')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active Tenant ID context' })
  @ApiOperation({ summary: 'Get enabled compensation/salary categories for active tenant' })
  async getActiveTenantSalaryTypes(@CurrentTenantId() tenantId: string) {
    return this.tenantsService.getTenantSalaryTypes(tenantId);
  }

  @Get(':id/salary-types')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get configured salary categories for any tenant (Super Admin)' })
  async getTenantSalaryTypesAdmin(
    @CurrentUser() user: any,
    @Param('id') targetTenantId: string
  ) {
    if (user?.email !== 'admin@peoplehub.com') {
      throw new ForbiddenException('Only platform Super Admin can inspect tenant salary categories');
    }
    return this.tenantsService.getTenantSalaryTypes(targetTenantId);
  }

  @Put(':id/salary-types')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update allowed employee salary categories for any tenant (Super Admin)' })
  async updateTenantSalaryTypesAdmin(
    @CurrentUser() user: any,
    @Param('id') targetTenantId: string,
    @Body() dto: UpdateTenantSalaryTypesDto
  ) {
    if (user?.email !== 'admin@peoplehub.com') {
      throw new ForbiddenException('Only platform Super Admin can configure tenant salary categories');
    }
    return this.tenantsService.updateTenantSalaryTypes(targetTenantId, dto.enabledSalaryTypes);
  }
}
