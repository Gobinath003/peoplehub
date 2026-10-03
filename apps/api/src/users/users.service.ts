import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeType } from '@people-hub/shared-types';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
    scopeId: string | null
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

    // 2. Verify role exists
    const role = await this.prisma.tenantClient.role.findFirst({
      where: {
        id: roleId,
        OR: [
          { tenantId },
          { tenantId: null }
        ]
      }
    });

    if (!role) {
      throw new NotFoundException('Role not found or unavailable in this tenant');
    }

    // 3. Check for existing identical role assignment
    const existing = await this.prisma.tenantClient.userRoleAssignment.findFirst({
      where: {
        tenantId,
        userId,
        roleId,
        scopeType,
        scopeId
      }
    });

    if (existing) {
      throw new ConflictException('Role is already assigned to this user with the specified scope');
    }

    // 4. Create assignment
    return this.prisma.tenantClient.userRoleAssignment.create({
      data: {
        userId,
        tenantId,
        roleId,
        scopeType,
        scopeId
      }
    });
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
