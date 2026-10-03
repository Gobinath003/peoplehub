import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentTenantId } from '../auth/current-tenant.decorator';
import { PermissionCode, AuditLogResponse } from '@people-hub/shared-types';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active Tenant ID context' })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @RequirePermissions(PermissionCode.AUDIT_LOG_VIEW)
  @ApiOperation({ summary: 'Retrieve active tenant audit logs' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getAuditLogs(@CurrentTenantId() tenantId: string): Promise<AuditLogResponse[]> {
    const logs = await this.auditService.findMany(tenantId);
    return logs.map((l: any) => ({
      id: l.id,
      tenantId: l.tenantId,
      userId: l.userId,
      userEmail: l.user ? l.user.email : null,
      action: l.action,
      entityName: l.entityName,
      entityId: l.entityId,
      oldValues: l.oldValues,
      newValues: l.newValues,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt.toISOString()
    }));
  }
}
