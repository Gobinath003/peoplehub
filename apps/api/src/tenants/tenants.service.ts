import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  TenantModuleResponse, 
  ModuleCode, 
  CreateTenantWithAdminRequest, 
  IndustryType,
  SystemRole,
  ScopeType,
  SalaryType
} from '@people-hub/shared-types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async listAllTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            employees: true,
            tenantUsers: true,
          }
        },
        tenantModules: {
          where: { isEnabled: true },
          select: { moduleCode: true }
        },
        tenantUsers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            }
          },
          take: 3
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return tenants.map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      industry: t.industry,
      status: t.status,
      address: t.address,
      phone: t.phone,
      email: t.email,
      website: t.website,
      taxId: t.taxId,
      registrationNo: t.registrationNo,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      employeeCount: t._count.employees,
      userCount: t._count.tenantUsers,
      enabledModules: (t.tenantModules || []).map((m: any) => m.moduleCode),
      enabledSalaryTypes: this.normalizeSalaryTypes(t.enabledSalaryTypes, t.industry),
      managers: t.tenantUsers.map((tu: any) => tu.user)
    }));
  }

  getDefaultSalaryTypesForIndustry(industry: IndustryType | string): string[] {
    switch (industry) {
      case IndustryType.GARMENTS:
        return [SalaryType.MONTHLY_FIXED, SalaryType.PIECE_RATE];
      case IndustryType.CONSULTANCY:
      case IndustryType.CORPORATE:
        return [SalaryType.MONTHLY_FIXED, SalaryType.HOURLY];
      case IndustryType.MANUFACTURING:
        return [SalaryType.MONTHLY_FIXED, SalaryType.HOURLY, SalaryType.PIECE_RATE, SalaryType.DAILY_WAGE];
      case IndustryType.LABOUR:
      case IndustryType.LOGISTICS:
        return [SalaryType.MONTHLY_FIXED, SalaryType.HOURLY, SalaryType.DAILY_WAGE];
      default:
        return [SalaryType.MONTHLY_FIXED, SalaryType.HOURLY];
    }
  }

  normalizeSalaryTypes(input?: string[] | null, industry?: IndustryType | string): string[] {
    const allowed = new Set<string>(Object.values(SalaryType));
    if (Array.isArray(input) && input.length > 0) {
      const filtered = Array.from(new Set(input.map((s) => String(s).trim().toUpperCase()).filter((s) => allowed.has(s))));
      if (filtered.length > 0) return filtered;
    }
    return this.getDefaultSalaryTypesForIndustry(industry || IndustryType.CORPORATE);
  }

  async getTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            employees: true,
            tenantUsers: true,
          }
        }
      }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      ...tenant,
      enabledSalaryTypes: this.normalizeSalaryTypes(tenant.enabledSalaryTypes, tenant.industry),
    };
  }

  async createTenantWithAdmin(dto: CreateTenantWithAdminRequest) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug }
    });
    if (existingTenant) {
      throw new ConflictException(`Company with slug "${dto.slug}" already exists`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug.toLowerCase().trim(),
          industry: dto.industry,
          status: 'ACTIVE',
          address: dto.address || null,
          phone: dto.phone || null,
          email: dto.email || null,
          website: dto.website || null,
          taxId: dto.taxId || null,
          registrationNo: dto.registrationNo || null,
          enabledSalaryTypes: this.normalizeSalaryTypes(dto.enabledSalaryTypes, dto.industry),
        }
      });

      // 2. Find or create admin/HR user
      let adminUser = await tx.user.findUnique({
        where: { email: dto.adminEmail }
      });

      if (!adminUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(dto.adminPassword || 'manager_pass', salt);
        adminUser = await tx.user.create({
          data: {
            email: dto.adminEmail.toLowerCase().trim(),
            passwordHash: hashedPassword,
            firstName: dto.adminFirstName.trim(),
            lastName: dto.adminLastName.trim(),
            status: 'ACTIVE',
          }
        });
      }

      // 3. Link user to tenant (upsert in case already linked)
      await tx.tenantUser.upsert({
        where: {
          tenantId_userId: {
            tenantId: tenant.id,
            userId: adminUser.id
          }
        },
        update: { status: 'ACTIVE' },
        create: {
          tenantId: tenant.id,
          userId: adminUser.id,
          status: 'ACTIVE'
        }
      });

      // 4. Create Roles for this tenant
      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          code: SystemRole.TENANT_ADMIN,
          name: 'Tenant Administrator',
          description: 'Full administrative access to the tenant company',
          isSystem: true
        }
      });

      const hrRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          code: SystemRole.HR_MANAGER,
          name: 'HR Manager',
          description: 'Human Resources & Payroll operations manager',
          isSystem: false
        }
      });

      // 5. Assign both Admin and HR Manager roles to the initial manager
      await tx.userRoleAssignment.createMany({
        data: [
          {
            userId: adminUser.id,
            tenantId: tenant.id,
            roleId: adminRole.id,
            scopeType: ScopeType.TENANT,
            scopeId: null
          },
          {
            userId: adminUser.id,
            tenantId: tenant.id,
            roleId: hrRole.id,
            scopeType: ScopeType.TENANT,
            scopeId: null
          }
        ]
      });

      // Also grant the platform Super Admin (admin@peoplehub.com) access to the newly created tenant
      const superAdmin = await tx.user.findUnique({ where: { email: 'admin@peoplehub.com' } });
      if (superAdmin && superAdmin.id !== adminUser.id) {
        await tx.tenantUser.upsert({
          where: { tenantId_userId: { tenantId: tenant.id, userId: superAdmin.id } },
          update: { status: 'ACTIVE' },
          create: { tenantId: tenant.id, userId: superAdmin.id, status: 'ACTIVE' }
        });
        await tx.userRoleAssignment.create({
          data: {
            userId: superAdmin.id,
            tenantId: tenant.id,
            roleId: adminRole.id,
            scopeType: ScopeType.TENANT,
            scopeId: null
          }
        });
      }

      // 6. Setup full platform module catalog and honor Super Admin selection
      const catalogModules = [
        ModuleCode.ORGANIZATION,
        ModuleCode.EMPLOYEES,
        ModuleCode.LEAVE,
        ModuleCode.ATTENDANCE,
        ModuleCode.SHIFTS,
        ModuleCode.PAYROLL,
        ModuleCode.ACCOUNTS,
        ModuleCode.AUDIT,
        ModuleCode.PIECE_RATE,
        ModuleCode.DRIVER_ROSTER,
        ModuleCode.TIMESHEET,
        ModuleCode.MUSTER_ROLL
      ];

      const defaultEnabled = [
        ModuleCode.ORGANIZATION,
        ModuleCode.EMPLOYEES,
        ModuleCode.LEAVE,
        ModuleCode.ATTENDANCE,
        ModuleCode.SHIFTS,
        ModuleCode.PAYROLL,
        ModuleCode.ACCOUNTS,
        ModuleCode.AUDIT
      ];

      if (dto.industry === IndustryType.GARMENTS) {
        defaultEnabled.push(ModuleCode.PIECE_RATE);
      } else if (dto.industry === IndustryType.LOGISTICS) {
        defaultEnabled.push(ModuleCode.DRIVER_ROSTER);
      } else if (dto.industry === IndustryType.CONSULTANCY) {
        defaultEnabled.push(ModuleCode.TIMESHEET);
      } else if (dto.industry === IndustryType.MANUFACTURING || dto.industry === IndustryType.LABOUR) {
        defaultEnabled.push(ModuleCode.MUSTER_ROLL);
      }

      const enabledSet = new Set<string>(
        Array.isArray(dto.enabledModules) ? dto.enabledModules : defaultEnabled
      );

      // Ensure all catalog modules exist globally before linking
      for (const code of catalogModules) {
        await tx.module.upsert({
          where: { code },
          update: {},
          create: {
            code,
            name: String(code).replace(/_/g, ' '),
            description: `${code} enterprise module`
          }
        });
      }

      await tx.tenantModule.createMany({
        data: catalogModules.map((code: any) => ({
          tenantId: tenant.id,
          moduleCode: code,
          isEnabled: enabledSet.has(code)
        }))
      });

      // 7. Associate full permissions catalog so toggling modules later works seamlessly
      const permissions = await tx.permission.findMany();

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p: any) => ({
            roleId: adminRole.id,
            permissionCode: p.code
          }))
        });

        const hrPermissions = permissions.filter((p: any) => 
          p.code.startsWith('EMPLOYEE_') || 
          p.code.startsWith('ATTENDANCE_') || 
          p.code.startsWith('PAYROLL_') ||
          p.code.startsWith('LEAVE_') ||
          p.code.startsWith('ACCOUNTS_')
        );

        if (hrPermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: hrPermissions.map((p: any) => ({
              roleId: hrRole.id,
              permissionCode: p.code
            }))
          });
        }

        const empRole = await tx.role.create({
          data: {
            tenantId: tenant.id,
            code: 'EMPLOYEE',
            name: 'Employee',
            description: 'Employee self-service access for leave availability, requests, and manager approvals',
            isSystem: true
          }
        });

        const empPermissions = permissions.filter(
          (p: any) => p.code === 'LEAVE_VIEW' || p.code === 'LEAVE_APPLY'
        );
        if (empPermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: empPermissions.map((p: any) => ({
              roleId: empRole.id,
              permissionCode: p.code
            }))
          });
        }
      }

      // Seed default corporate Leave Type Masters for the new tenant
      await tx.leaveType.createMany({
        data: [
          {
            tenantId: tenant.id,
            code: 'CL',
            name: 'Casual Leave',
            description: 'Short-term personal leave for urgent or planned personal matters.',
            annualQuota: 12,
            accrualType: 'ANNUAL_UPFRONT',
            carryForwardLimit: 0,
            maxConsecutiveDays: 5,
            minNoticeDays: 0,
            allowHalfDay: true,
            isPaid: true,
            colorHex: '#0EA5E9',
            isActive: true
          },
          {
            tenantId: tenant.id,
            code: 'SL',
            name: 'Sick Leave',
            description: 'Medical and recovery leave for health reasons.',
            annualQuota: 8,
            accrualType: 'ANNUAL_UPFRONT',
            carryForwardLimit: 4,
            maxConsecutiveDays: 10,
            minNoticeDays: 0,
            allowHalfDay: true,
            isPaid: true,
            colorHex: '#F43F5E',
            isActive: true
          },
          {
            tenantId: tenant.id,
            code: 'EL',
            name: 'Earned Leave',
            description: 'Privilege / annual vacation leave eligible for carry forward.',
            annualQuota: 15,
            accrualType: 'MONTHLY_PRO_RATA',
            carryForwardLimit: 15,
            maxConsecutiveDays: 15,
            minNoticeDays: 3,
            allowHalfDay: false,
            isPaid: true,
            colorHex: '#10B981',
            isActive: true
          },
          {
            tenantId: tenant.id,
            code: 'LOP',
            name: 'Loss of Pay (Unpaid)',
            description: 'Unpaid leave when paid leave quotas are exhausted.',
            annualQuota: 0,
            accrualType: 'NONE',
            carryForwardLimit: 0,
            maxConsecutiveDays: 30,
            minNoticeDays: 0,
            allowHalfDay: true,
            isPaid: false,
            colorHex: '#64748B',
            isActive: true
          }
        ]
      });

      return {
        tenant,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
        }
      };
    });
  }

  async getTenantModules(tenantId: string): Promise<TenantModuleResponse[]> {
    const tenantModules = await this.prisma.tenantModule.findMany({
      where: { tenantId },
      include: { module: true },
      orderBy: { moduleCode: 'asc' }
    });

    return tenantModules.map((tm: any) => ({
      moduleCode: tm.moduleCode as ModuleCode,
      moduleName: tm.module.name,
      isEnabled: tm.isEnabled
    }));
  }

  async updateModuleState(tenantId: string, moduleCode: string, isEnabled: boolean) {
    await this.prisma.module.upsert({
      where: { code: moduleCode },
      update: {},
      create: {
        code: moduleCode,
        name: String(moduleCode).replace(/_/g, ' '),
        description: `${moduleCode} enterprise module`
      }
    });

    return this.prisma.tenantModule.upsert({
      where: {
        tenantId_moduleCode: {
          tenantId,
          moduleCode
        }
      },
      update: { isEnabled },
      create: {
        tenantId,
        moduleCode,
        isEnabled
      }
    });
  }

  async updateTenantModulesBulk(tenantId: string, enabledModules: string[]): Promise<TenantModuleResponse[]> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const catalogModules = Object.values(ModuleCode);
    const allCodes = Array.from(new Set([...catalogModules, ...enabledModules]));
    const enabledSet = new Set(enabledModules);

    await this.prisma.$transaction(async (tx: any) => {
      for (const code of allCodes) {
        await tx.module.upsert({
          where: { code },
          update: {},
          create: {
            code,
            name: String(code).replace(/_/g, ' '),
            description: `${code} enterprise module`
          }
        });
        await tx.tenantModule.upsert({
          where: {
            tenantId_moduleCode: {
              tenantId,
              moduleCode: code
            }
          },
          update: { isEnabled: enabledSet.has(code) },
          create: {
            tenantId,
            moduleCode: code,
            isEnabled: enabledSet.has(code)
          }
        });
      }
    });

    return this.getTenantModules(tenantId);
  }

  async getTenantSalaryTypes(tenantId: string): Promise<{ enabledSalaryTypes: string[] }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, industry: true, enabledSalaryTypes: true }
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
    return {
      enabledSalaryTypes: this.normalizeSalaryTypes(tenant.enabledSalaryTypes, tenant.industry)
    };
  }

  async updateTenantSalaryTypes(tenantId: string, enabledSalaryTypes: string[]): Promise<{ enabledSalaryTypes: string[] }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true }
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const allowed = new Set<string>(Object.values(SalaryType));
    const cleaned = Array.from(
      new Set((enabledSalaryTypes || []).map((s) => String(s).trim().toUpperCase()).filter((s) => allowed.has(s)))
    );
    if (cleaned.length === 0) {
      throw new BadRequestException('At least one employee salary category must be enabled for a tenant');
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { enabledSalaryTypes: cleaned }
    });

    return { enabledSalaryTypes: cleaned };
  }
}
