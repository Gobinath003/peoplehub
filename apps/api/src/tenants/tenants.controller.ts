import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import { 
  PermissionCode, 
  TenantModuleResponse, 
  CreateTenantWithAdminRequest, 
  IndustryType 
} from '@people-hub/shared-types';

class UpdateModuleStateDto {
  isEnabled!: boolean;
}

class CreateTenantDto implements CreateTenantWithAdminRequest {
  name!: string;
  slug!: string;
  industry!: IndustryType;
  adminEmail!: string;
  adminPassword!: string;
  adminFirstName!: string;
  adminLastName!: string;
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
  async listAllTenants() {
    return this.tenantsService.listAllTenants();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Company Tenant and provision initial HR Manager (Super Admin)' })
  @ApiResponse({ status: 201, description: 'Company Tenant and Manager created successfully' })
  async createTenant(@Body() dto: CreateTenantDto) {
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
}
