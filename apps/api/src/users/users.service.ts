import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeType } from '@people-hub/shared-types';

const STANDARD_ROLE_DEFINITIONS: Array<{
  code: string;
  name: string;
  isSystem: boolean;
  permissionFilter: (permCode: string) => boolean;
}> = [
  {
    code: 'TENANT_ADMIN',
    name: 'Tenant Administrator',
    isSystem: true,
    permissionFilter: () => true,
  },
  {
    code: 'HR_MANAGER',
    name: 'HR Manager',
    isSystem: false,
    permissionFilter: (c) =>
      c.startsWith('EMPLOYEE_') ||
      c.startsWith('ATTENDANCE_') ||
      c.startsWith('LEAVE_') ||
      c === 'PAYROLL_VIEW' ||
      c === 'AUDIT_LOG_VIEW' ||
      c === 'TENANT_SETTINGS_VIEW',
  },
  {
    code: 'PAYROLL_MANAGER',
    name: 'Payroll Manager',
    isSystem: false,
    permissionFilter: (c) =>
      c === 'EMPLOYEE_VIEW' ||
      c === 'ATTENDANCE_VIEW' ||
      c === 'LEAVE_VIEW' ||
      c.startsWith('PAYROLL_') ||
      c.startsWith('ACCOUNTS_') ||
      c === 'AUDIT_LOG_VIEW',
  },
  {
    code: 'EMPLOYEE',
    name: 'Employee',
    isSystem: true,
    permissionFilter: (c) => c === 'EMPLOYEE_VIEW' || c === 'ATTENDANCE_VIEW' || c === 'LEAVE_VIEW',
  },
];

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private async ensureStandardRoles(tenantId: string) {
    const existingRoles = await this.prisma.tenantClient.role.findMany({
      where: { tenantId },
      select: { code: true },
    });
    const existingCodes = new Set(existingRoles.map((r: any) => r.code));
    const missingDefs = STANDARD_ROLE_DEFINITIONS.filter((d) => !existingCodes.has(d.code));
    if (missingDefs.length === 0) return;

    const allPerms = await this.prisma.permission.findMany({ select: { code: true } });
    for (const def of missingDefs) {
      const createdRole = await this.prisma.tenantClient.role.create({
        data: {
          tenantId,
          code: def.code,
          name: def.name,
          isSystem: def.isSystem,
        },
      });
      const matchedPerms = allPerms.filter((p: any) => def.permissionFilter(p.code));
      if (matchedPerms.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: matchedPerms.map((p: any) => ({
            roleId: createdRole.id,
            permissionCode: p.code,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  async listTenantRoles(tenantId: string) {
    await this.ensureStandardRoles(tenantId);
    const roles = await this.prisma.tenantClient.role.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return roles.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      isSystem: r.isSystem,
    }));
  }

  async listTenantUsers(tenantId: string) {
    const tenantUsers = await this.prisma.tenantClient.tenantUser.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    return tenantUsers.map((tu: any) => ({
      id: tu.user.id,
      email: tu.user.email,
      firstName: tu.user.firstName,
      lastName: tu.user.lastName,
      status: tu.status,
      createdAt: tu.user.createdAt.toISOString()
    }));
  }

  async getUserRoles(tenantId: string, userId: string) {
    // Run in tenant context
    const assignments = await this.prisma.tenantClient.userRoleAssignment.findMany({
      where: { tenantId, userId },
      include: {
        role: true
      }
    });

    return assignments.map((ra: any) => ({
      id: ra.id,
      roleId: ra.roleId,
      roleCode: ra.role.code,
      roleName: ra.role.name,
      scopeType: ra.scopeType as ScopeType,
      scopeId: ra.scopeId
    }));
  }

  async assignUserRole(
    tenantId: string,
    userId: string,
    roleId: string,
    scopeType: ScopeType,
    scopeId: string | null,
    roleCode?: string
  ) {
    // 1. Verify user is in tenant
    const membership = await this.prisma.tenantClient.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      }
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this tenant');
    }

    // 2. Ensure standard roles exist & resolve role by ID or Code
    await this.ensureStandardRoles(tenantId);
    const trimmedRoleId = roleId?.trim() || '';
    const trimmedRoleCode = roleCode?.trim() || '';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedRoleId);
    const lookupOr: any[] = [];
    if (isUuid) lookupOr.push({ id: trimmedRoleId });
    if (trimmedRoleCode) lookupOr.push({ code: trimmedRoleCode });

    if (lookupOr.length === 0) {
      throw new BadRequestException('Valid roleId or roleCode is required');
    }

    const role = await this.prisma.tenantClient.role.findFirst({
      where: {
        OR: lookupOr,
        AND: [
          {
            OR: [
              { tenantId },
              { tenantId: null }
            ]
          }
        ]
      }
    });

    if (!role) {
      throw new NotFoundException('Role not found or unavailable in this tenant');
    }

    const normalizedScopeId =
      scopeType === ScopeType.TENANT || scopeType === ScopeType.OWN
        ? null
        : (scopeId?.trim() || null);

    if ((scopeType === ScopeType.BRANCH || scopeType === ScopeType.DEPARTMENT) && !normalizedScopeId) {
      throw new BadRequestException(`Scope Target Identifier is required for ${scopeType} scope`);
    }

    // 3. Check for existing identical role assignment
    const existing = await this.prisma.tenantClient.userRoleAssignment.findFirst({
      where: {
        tenantId,
        userId,
        roleId: role.id,
        scopeType,
        scopeId: normalizedScopeId
      }
    });

    if (existing) {
      throw new ConflictException('Role is already assigned to this user with the specified scope');
    }

    // 4. Create assignment
    const created = await this.prisma.tenantClient.userRoleAssignment.create({
      data: {
        userId,
        tenantId,
        roleId: role.id,
        scopeType,
        scopeId: normalizedScopeId
      },
      include: {
        role: true
      }
    });

    return {
      id: created.id,
      roleId: created.roleId,
      roleCode: created.role.code,
      roleName: created.role.name,
      scopeType: created.scopeType as ScopeType,
      scopeId: created.scopeId,
    };
  }

  async removeUserRole(tenantId: string, assignmentId: string) {
    const assignment = await this.prisma.tenantClient.userRoleAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment || assignment.tenantId !== tenantId) {
      throw new NotFoundException('Role assignment not found');
    }

    return this.prisma.tenantClient.userRoleAssignment.delete({
      where: { id: assignmentId }
    });
  }
}
