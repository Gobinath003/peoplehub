import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  TenantModuleResponse, 
  ModuleCode, 
  CreateTenantWithAdminRequest, 
  IndustryType,
  SystemRole,
  ScopeType 
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
      managers: t.tenantUsers.map((tu: any) => tu.user)
    }));
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

    return tenant;
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

      // 6. Setup default modules
      const defaultModules = [
        ModuleCode.ORGANIZATION,
        ModuleCode.EMPLOYEES,
        ModuleCode.ATTENDANCE,
        ModuleCode.LEAVE,
        ModuleCode.SHIFTS,
        ModuleCode.PAYROLL,
        ModuleCode.AUDIT
      ];

      if (dto.industry === IndustryType.GARMENTS) {
        defaultModules.push(ModuleCode.PIECE_RATE);
      } else if (dto.industry === IndustryType.LOGISTICS) {
        defaultModules.push(ModuleCode.DRIVER_ROSTER);
      } else if (dto.industry === IndustryType.CONSULTANCY) {
        defaultModules.push(ModuleCode.TIMESHEET);
      } else if (dto.industry === IndustryType.MANUFACTURING || dto.industry === IndustryType.LABOUR) {
        defaultModules.push(ModuleCode.MUSTER_ROLL);
      }

      // Ensure all default modules exist in global catalog before linking
      for (const code of defaultModules) {
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
        data: defaultModules.map((code: any) => ({
          tenantId: tenant.id,
          moduleCode: code,
          isEnabled: true
        }))
      });

      // 7. Associate all permissions of the active modules to admin and HR roles
      const permissions = await tx.permission.findMany({
        where: { moduleCode: { in: defaultModules } }
      });

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
          p.code.startsWith('LEAVE_')
        );

        if (hrPermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: hrPermissions.map((p: any) => ({
              roleId: hrRole.id,
              permissionCode: p.code
            }))
          });
        }
      }

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
    const tenantModules = await this.prisma.tenantClient.tenantModule.findMany({
      where: { tenantId },
      include: { module: true }
    });

    return tenantModules.map((tm: any) => ({
      moduleCode: tm.moduleCode as ModuleCode,
      moduleName: tm.module.name,
      isEnabled: tm.isEnabled
    }));
  }

  async updateModuleState(tenantId: string, moduleCode: string, isEnabled: boolean) {
    const record = await this.prisma.tenantClient.tenantModule.findUnique({
      where: {
        tenantId_moduleCode: {
          tenantId,
          moduleCode
        }
      }
    });

    if (!record) {
      throw new NotFoundException(`Module ${moduleCode} is not registered for this tenant`);
    }

    return this.prisma.tenantClient.tenantModule.update({
      where: {
        tenantId_moduleCode: {
          tenantId,
          moduleCode
        }
      },
      data: { isEnabled }
    });
  }
}
