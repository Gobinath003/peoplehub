import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionCode, ScopeType } from '@people-hub/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication session is required');
    }

    // 1. Check if user has ALL required permissions in token
    const hasAllPermissions = requiredPermissions.every(perm => 
      user.permissions.includes(perm)
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('You do not have the required permissions to access this resource');
    }

    // 2. Evaluate Data Scope limits
    // We attach the user's role scope configurations to the request so that
    // the services or controller can easily read and filter by them.
    request.userScopes = user.roles.map((r: any) => ({
      roleCode: r.code,
      scopeType: r.scopeType,
      scopeId: r.scopeId
    }));

    // Example of automatic parameter-based scope validation:
    // If the request contains branchId, departmentId, or companyId, we can validate it.
    const branchId = request.params.branchId || request.query.branchId;
    const departmentId = request.params.departmentId || request.query.departmentId;
    const employeeId = request.params.employeeId || request.query.employeeId;

    for (const assignment of user.roles) {
      // If user has a tenant-wide scope, they have full access.
      if (assignment.scopeType === ScopeType.TENANT) {
        continue;
      }

      // Check branch scope
      if (branchId && assignment.scopeType === ScopeType.BRANCH && assignment.scopeId !== branchId) {
        throw new ForbiddenException(`Resource access denied: operation restricted to branch ${assignment.scopeId}`);
      }

      // Check department scope
      if (departmentId && assignment.scopeType === ScopeType.DEPARTMENT && assignment.scopeId !== departmentId) {
        throw new ForbiddenException(`Resource access denied: operation restricted to department ${assignment.scopeId}`);
      }

      // Check individual scope
      if (employeeId && assignment.scopeType === ScopeType.OWN && user.id !== employeeId) {
        throw new ForbiddenException(`Resource access denied: operation restricted to own record`);
      }
    }

    return true;
  }
}
