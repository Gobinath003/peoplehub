import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import { PermissionCode, ScopeType, UserResponse, UserRoleResponse } from '@people-hub/shared-types';

class AssignRoleDto {
  roleId!: string;
  scopeType!: ScopeType;
  scopeId!: string | null;
}

@ApiTags('Users & RBAC')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active Tenant ID context' })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions(PermissionCode.EMPLOYEE_VIEW)
  @ApiOperation({ summary: 'List all users belonging to the active tenant' })
  @ApiResponse({ status: 200, description: 'Users list retrieved successfully' })
  async getTenantUsers(@CurrentTenantId() tenantId: string): Promise<UserResponse[]> {
    return this.usersService.listTenantUsers(tenantId);
  }

  @Get(':userId/roles')
  @RequirePermissions(PermissionCode.EMPLOYEE_VIEW)
  @ApiOperation({ summary: 'Get active tenant roles assigned to a user' })
  @ApiResponse({ status: 200, description: 'User roles retrieved successfully' })
  async getUserRoles(
    @CurrentTenantId() tenantId: string,
    @Param('userId') userId: string
  ): Promise<UserRoleResponse[]> {
    return this.usersService.getUserRoles(tenantId, userId);
  }

  @Post(':userId/roles')
  @RequirePermissions(PermissionCode.EMPLOYEE_EDIT)
  @ApiOperation({ summary: 'Assign a role to a user with specific data scope' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  async assignUserRole(
    @CurrentTenantId() tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto
  ) {
    return this.usersService.assignUserRole(tenantId, userId, dto.roleId, dto.scopeType, dto.scopeId);
  }

  @Delete('roles/:assignmentId')
  @RequirePermissions(PermissionCode.EMPLOYEE_EDIT)
  @ApiOperation({ summary: 'Revoke a role assignment from a user' })
  @ApiResponse({ status: 200, description: 'Role assignment revoked successfully' })
  async removeUserRole(
    @CurrentTenantId() tenantId: string,
    @Param('assignmentId') assignmentId: string
  ) {
    return this.usersService.removeUserRole(tenantId, assignmentId);
  }
}
