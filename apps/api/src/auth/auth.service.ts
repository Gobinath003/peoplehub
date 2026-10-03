import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../prisma/tenant-context';
import { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenResponse, 
  IndustryType,
  ScopeType,
  SystemRole,
  PermissionCode,
  ModuleCode
} from '@people-hub/shared-types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(email: string, passwordHash: string, firstName: string, lastName: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(passwordHash, salt);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: encryptedPassword,
        firstName,
        lastName,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      }
    });
  }

  async login(dto: LoginRequest): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        tenantUsers: {
          include: {
            tenant: true
          }
        }
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const plainPassword = (dto as any).password || dto.passwordHash;
    if (!plainPassword) {
      throw new UnauthorizedException('Password is required');
    }

    const isMatch = await bcrypt.compare(plainPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Find if user has any tenants
    const tenants = user.tenantUsers.map((tu: any) => ({
      id: tu.tenant.id,
      name: tu.tenant.name,
      slug: tu.tenant.slug,
      industry: tu.tenant.industry as IndustryType
    }));

    const activeTenantContext = tenants.length > 0 ? tenants[0] : null;
    let roles: any[] = [];
    let permissions: string[] = [];
    let enabledModules: string[] = [];
    let accessToken = '';
    let refreshToken = '';

    if (activeTenantContext) {
      // Load context for active tenant
      const context = await this.getTenantUserContext(user.id, activeTenantContext.id);
      roles = context.roles;
      permissions = context.permissions;
      enabledModules = context.enabledModules;

      accessToken = this.generateAccessToken(user.id, activeTenantContext.id, roles, permissions);
      refreshToken = await this.generateRefreshToken(user.id);
    } else {
      // User with no tenant (needs to create one)
      accessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, tenantId: null, roles: [], permissions: [] },
        { expiresIn: '15m' }
      );
      refreshToken = await this.generateRefreshToken(user.id);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      activeTenant: activeTenantContext,
      tenants,
      roles,
      permissions,
      enabledModules
    };
  }

  async switchTenant(userId: string, tenantId: string): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantUsers: {
          include: {
            tenant: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const membership = user.tenantUsers.find((tu: any) => tu.tenantId === tenantId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    const tenants = user.tenantUsers.map((tu: any) => ({
      id: tu.tenant.id,
      name: tu.tenant.name,
      slug: tu.tenant.slug,
      industry: tu.tenant.industry as IndustryType
    }));

    const activeTenant = tenants.find((t: any) => t.id === tenantId)!;

    const context = await this.getTenantUserContext(userId, tenantId);

    const accessToken = this.generateAccessToken(userId, tenantId, context.roles, context.permissions);
    const refreshToken = await this.generateRefreshToken(userId);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      activeTenant,
      tenants,
      roles: context.roles,
      permissions: context.permissions,
      enabledModules: context.enabledModules
    };
  }

  async refresh(token: string): Promise<RefreshTokenResponse> {
    const record = await this.prisma.refreshToken.findFirst({
      where: { token, revoked: false, expiresAt: { gt: new Date() } }
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke current token
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revoked: true }
    });

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      include: { tenantUsers: true }
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is suspended or deactivated');
    }

    // Determine tenant context
    const activeTenantId = user.tenantUsers.length > 0 ? user.tenantUsers[0].tenantId : null;
    let roles: any[] = [];
    let permissions: string[] = [];

    if (activeTenantId) {
      const context = await this.getTenantUserContext(user.id, activeTenantId);
      roles = context.roles;
      permissions = context.permissions;
    }

    const nextAccessToken = this.generateAccessToken(user.id, activeTenantId, roles, permissions);
    const nextRefreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken
    };
  }

  // Create a tenant and auto-configure Roles / Permissions / Modules
  async createTenant(userId: string, name: string, slug: string, industry: IndustryType) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Tenant slug already taken');
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          industry,
          status: 'ACTIVE'
        }
      });

      // 2. Link User to Tenant
      await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId,
          status: 'ACTIVE'
        }
      });

      // 3. Create Tenant Role (TENANT_ADMIN)
      const role = await tx.role.create({
        data: {
          tenantId: tenant.id,
          code: SystemRole.TENANT_ADMIN,
          name: 'Tenant Administrator',
          description: 'Full administrative access to the tenant account',
          isSystem: true
        }
      });

      // 4. Assign role to user with TENANT scope
      await tx.userRoleAssignment.create({
        data: {
          userId,
          tenantId: tenant.id,
          roleId: role.id,
          scopeType: ScopeType.TENANT,
          scopeId: null
        }
      });

      // 5. Activate Core Modules by default
      const defaultModules = [
        ModuleCode.ORGANIZATION,
        ModuleCode.EMPLOYEES,
        ModuleCode.ATTENDANCE,
        ModuleCode.LEAVE,
        ModuleCode.SHIFTS,
        ModuleCode.PAYROLL,
        ModuleCode.DOCUMENTS,
        ModuleCode.EXPENSES,
        ModuleCode.REPORTS,
        ModuleCode.AUDIT
      ];

      // Add industry specific module
      if (industry === IndustryType.GARMENTS) {
        defaultModules.push(ModuleCode.PIECE_RATE);
      } else if (industry === IndustryType.MANUFACTURING || industry === IndustryType.LABOUR) {
        defaultModules.push(ModuleCode.MUSTER_ROLL);
      } else if (industry === IndustryType.CONSULTANCY) {
        defaultModules.push(ModuleCode.TIMESHEET);
      } else if (industry === IndustryType.LOGISTICS) {
        defaultModules.push(ModuleCode.DRIVER_ROSTER);
      }

      await tx.tenantModule.createMany({
        data: defaultModules.map(code => ({
          tenantId: tenant.id,
          moduleCode: code,
          isEnabled: true
        }))
      });

      // 6. Map all permissions for the default modules to the Tenant Admin role
      // Load all permissions matching these module codes
      const permissions = await tx.permission.findMany({
        where: { moduleCode: { in: defaultModules } }
      });

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p: any) => ({
            roleId: role.id,
            permissionCode: p.code
          }))
        });
      }

      return tenant;
    });
  }

  // --- Helper Methods ---

  private generateAccessToken(userId: string, tenantId: string | null, roles: any[], permissions: string[]): string {
    const payload = {
      sub: userId,
      tenantId,
      roles: roles.map((r: any) => ({
        code: r.roleCode,
        scopeType: r.scopeType,
        scopeId: r.scopeId
      })),
      permissions
    };
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret', expiresIn: '7d' }
    );

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt: expiry
      }
    });

    return token;
  }

  private async getTenantUserContext(userId: string, tenantId: string) {
    // Run within TenantContext scope so we can query roles safely
    return TenantContext.run(tenantId, async () => {
      // Get role assignments
      const roleAssignments = await this.prisma.userRoleAssignment.findMany({
        where: { userId, tenantId },
        include: {
          role: {
            include: {
              rolePermissions: true
            }
          }
        }
      });

      const roles = roleAssignments.map((ra: any) => ({
        roleId: ra.roleId,
        roleCode: ra.role.code,
        scopeType: ra.scopeType,
        scopeId: ra.scopeId
      }));

      // Gather distinct permission codes
      const permissionSet = new Set<string>();
      roleAssignments.forEach((ra: any) => {
        ra.role.rolePermissions.forEach((rp: any) => {
          permissionSet.add(rp.permissionCode);
        });
      });

      // Get enabled modules
      const activeModules = await this.prisma.tenantModule.findMany({
        where: { tenantId, isEnabled: true }
      });

      return {
        roles,
        permissions: Array.from(permissionSet),
        enabledModules: activeModules.map((m: any) => m.moduleCode)
      };
    });
  }
}
