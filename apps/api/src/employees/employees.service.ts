import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeRequest, UpdateEmployeeRequest, ProvisionEmployeeLoginRequest, EmployeeDto, SalaryType } from '@people-hub/shared-types';
import * as bcrypt from 'bcrypt';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  private isUuid(value?: string | null): value is string {
    return typeof value === 'string' && UUID_RE.test(value.trim());
  }

  /**
   * Resolves a master relation safely by UUID (scoped to tenantId) or falls back
   * cleanly by name lookup without ever forwarding non-UUID fallback IDs to Postgres.
   */
  private async resolveNamedMaster(
    delegate: any,
    tenantId: string,
    rawId?: string | null,
    fallbackName?: string | null,
  ): Promise<{ id: string | null; name: string | null }> {
    const trimmedName = fallbackName?.trim() || null;
    if (this.isUuid(rawId)) {
      const rec = await delegate.findFirst({ where: { id: rawId.trim(), tenantId } });
      if (rec) return { id: rec.id, name: rec.name };
    }
    if (trimmedName) {
      const byName = await delegate.findFirst({
        where: { tenantId, name: { equals: trimmedName, mode: 'insensitive' } },
      });
      if (byName) return { id: byName.id, name: byName.name };
    }
    return { id: null, name: trimmedName };
  }

  private async resolveOptionalMasterId(
    delegate: any,
    tenantId: string,
    rawId?: string | null,
  ): Promise<string | null> {
    if (!this.isUuid(rawId)) return null;
    const rec = await delegate.findFirst({ where: { id: rawId.trim(), tenantId }, select: { id: true } });
    return rec?.id || null;
  }

  async list(tenantId: string, branchScope?: string | null): Promise<EmployeeDto[]> {
    const whereClause: any = { tenantId };
    if (branchScope) {
      whereClause.branch = branchScope;
    }

    const employees = await this.prisma.tenantClient.employee.findMany({
      where: whereClause,
      include: {
        salaryStructure: true,
        reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return employees.map((emp: any) => this.mapToDto(emp));
  }

  async getById(tenantId: string, id: string): Promise<EmployeeDto> {
    const employee = await this.prisma.tenantClient.employee.findFirst({
      where: { id, tenantId },
      include: {
        salaryStructure: true,
        reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        payslips: {
          orderBy: { year: 'desc' },
          take: 6
        }
      }
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return this.mapToDto(employee);
  }

  async create(tenantId: string, dto: CreateEmployeeRequest): Promise<EmployeeDto> {
    // 1. Resolve or auto-generate employee code
    let finalCode = dto.employeeCode ? dto.employeeCode.trim().toUpperCase() : '';
    if (!finalCode) {
      const count = await this.prisma.tenantClient.employee.count({ where: { tenantId } });
      let attempt = count + 1;
      finalCode = `EMP-${attempt.toString().padStart(4, '0')}`;
      while (await this.prisma.tenantClient.employee.findFirst({ where: { tenantId, employeeCode: finalCode } })) {
        attempt++;
        finalCode = `EMP-${attempt.toString().padStart(4, '0')}`;
      }
    } else {
      const existing = await this.prisma.tenantClient.employee.findFirst({
        where: {
          tenantId,
          employeeCode: finalCode
        }
      });

      if (existing) {
        throw new ConflictException(`Employee code "${finalCode}" already exists in this company`);
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 2. Safely resolve master names and foreign keys (ignoring non-UUID fallback IDs)
      const resolvedDept = await this.resolveNamedMaster(tx.department, tenantId, dto.departmentId, dto.department);
      const resolvedDesig = await this.resolveNamedMaster(tx.designation, tenantId, dto.designationId, dto.designation);
      const resolvedBranch = await this.resolveNamedMaster(tx.branch, tenantId, dto.branchId, dto.branch);
      const shiftId = await this.resolveOptionalMasterId(tx.shift, tenantId, dto.shiftId);
      const employmentTypeId = await this.resolveOptionalMasterId(tx.employmentType, tenantId, dto.employmentTypeId);

      const deptName = resolvedDept.name || 'General';
      const desigName = resolvedDesig.name || 'Staff';
      const branchName = resolvedBranch.name || null;

      // Create Employee
      const tenantRecord = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { enabledSalaryTypes: true }
      });
      const allowedTypes = Array.isArray(tenantRecord?.enabledSalaryTypes) && tenantRecord.enabledSalaryTypes.length > 0
        ? tenantRecord.enabledSalaryTypes
        : Object.values(SalaryType);
      const effectiveSalaryType = (dto.salaryType || allowedTypes[0] || SalaryType.MONTHLY_FIXED).toUpperCase();
      if (!allowedTypes.includes(effectiveSalaryType)) {
        throw new BadRequestException(
          `Compensation category "${effectiveSalaryType}" is not enabled for this tenant. Enable it under Tenant Management.`
        );
      }

      const parsedJoiningDate = dto.joiningDate ? new Date(dto.joiningDate) : new Date();
      if (Number.isNaN(parsedJoiningDate.getTime())) {
        throw new BadRequestException('Invalid date of joining');
      }

      const cleanReportingManagerId = this.isUuid(dto.reportingManagerId) ? dto.reportingManagerId.trim() : null;
      if (cleanReportingManagerId) {
        await this.validateReportingManager(tenantId, null, cleanReportingManagerId, tx);
      }

      const employee = await tx.employee.create({
        data: {
          tenantId,
          employeeCode: finalCode,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email: dto.email ? dto.email.toLowerCase().trim() : null,
          phone: dto.phone || null,
          department: deptName,
          designation: desigName,
          branch: branchName,
          departmentId: resolvedDept.id,
          designationId: resolvedDesig.id,
          branchId: resolvedBranch.id,
          shiftId,
          employmentTypeId,
          reportingManagerId: cleanReportingManagerId,
          salaryType: effectiveSalaryType,
          joiningDate: parsedJoiningDate,
          status: dto.status || 'ACTIVE',
        }
      });

      // 3. Create SalaryStructure when rate or salary components are provided
      let salaryStructure = null;
      const salaryData = this.buildSalaryData(effectiveSalaryType, dto);
      if (salaryData) {
        salaryStructure = await tx.salaryStructure.create({
          data: {
            tenantId,
            employeeId: employee.id,
            ...salaryData,
            currency: 'INR',
          }
        });
      }

      const currentYear = new Date().getFullYear();
      const activeLeaveTypes = await tx.leaveType.findMany({
        where: { tenantId, isActive: true }
      });
      if (activeLeaveTypes.length > 0) {
        await tx.employeeLeaveBalance.createMany({
          data: activeLeaveTypes.map((lt: any) => ({
            tenantId,
            employeeId: employee.id,
            leaveTypeId: lt.id,
            year: currentYear,
            allocated: lt.annualQuota,
            carryForward: 0,
            used: 0,
            pending: 0
          })),
          skipDuplicates: true
        });
      }

      let finalEmployee = employee;
      if (dto.createPortalLogin) {
        finalEmployee = await this.attachPortalUserInTx(tx, tenantId, employee, {
          email: dto.email || undefined,
          password: dto.portalPassword || 'Welcome@123',
          roleCode: dto.roleCode || 'EMPLOYEE'
        });
      }

      const reportingManager = finalEmployee.reportingManagerId
        ? await tx.employee.findUnique({
            where: { id: finalEmployee.reportingManagerId },
            select: { id: true, employeeCode: true, firstName: true, lastName: true }
          })
        : null;

      return this.mapToDto({ ...finalEmployee, salaryStructure, reportingManager });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeRequest): Promise<EmployeeDto> {
    const existing = await this.prisma.tenantClient.employee.findFirst({
      where: { id, tenantId },
      include: { salaryStructure: true }
    });

    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const nextSalaryType = dto.salaryType ? dto.salaryType.toUpperCase() : existing.salaryType;
    if (dto.salaryType !== undefined && nextSalaryType !== existing.salaryType) {
      const tenantRecord = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { enabledSalaryTypes: true }
      });
      const allowedTypes = Array.isArray(tenantRecord?.enabledSalaryTypes) && tenantRecord.enabledSalaryTypes.length > 0
        ? tenantRecord.enabledSalaryTypes
        : Object.values(SalaryType);
      if (!allowedTypes.includes(nextSalaryType)) {
        throw new BadRequestException(
          `Compensation category "${nextSalaryType}" is not enabled for this tenant. Enable it under Tenant Management.`
        );
      }
    }

    const data: any = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.email !== undefined) data.email = dto.email ? dto.email.toLowerCase().trim() : null;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.designation !== undefined) data.designation = dto.designation;
    if (dto.branch !== undefined) data.branch = dto.branch;
    if (dto.departmentId !== undefined) {
      const resolved = await this.resolveNamedMaster(this.prisma.department, tenantId, dto.departmentId, dto.department);
      data.departmentId = resolved.id;
      if (resolved.name) data.department = resolved.name;
    }
    if (dto.designationId !== undefined) {
      const resolved = await this.resolveNamedMaster(this.prisma.designation, tenantId, dto.designationId, dto.designation);
      data.designationId = resolved.id;
      if (resolved.name) data.designation = resolved.name;
    }
    if (dto.branchId !== undefined) {
      const resolved = await this.resolveNamedMaster(this.prisma.branch, tenantId, dto.branchId, dto.branch);
      data.branchId = resolved.id;
      if (resolved.name) data.branch = resolved.name;
    }
    if (dto.shiftId !== undefined) {
      data.shiftId = await this.resolveOptionalMasterId(this.prisma.shift, tenantId, dto.shiftId);
    }
    if (dto.employmentTypeId !== undefined) {
      data.employmentTypeId = await this.resolveOptionalMasterId(this.prisma.employmentType, tenantId, dto.employmentTypeId);
    }
    if (dto.reportingManagerId !== undefined) {
      const cleanedMgrId = dto.reportingManagerId ? dto.reportingManagerId.trim() : '';
      if (cleanedMgrId) {
        if (!this.isUuid(cleanedMgrId)) {
          throw new BadRequestException('Invalid reporting manager identifier');
        }
        await this.validateReportingManager(tenantId, id, cleanedMgrId);
        data.reportingManagerId = cleanedMgrId;
      } else {
        data.reportingManagerId = null;
      }
    }
    if (dto.salaryType !== undefined) data.salaryType = nextSalaryType;
    if (dto.joiningDate !== undefined) {
      const parsedJoin = new Date(dto.joiningDate);
      if (Number.isNaN(parsedJoin.getTime())) {
        throw new BadRequestException('Invalid date of joining');
      }
      data.joiningDate = parsedJoin;
    }
    if (dto.status !== undefined) data.status = dto.status;

    const hasCompChange =
      dto.basicSalary !== undefined ||
      dto.hra !== undefined ||
      dto.specialAllowance !== undefined ||
      dto.conveyanceAllowance !== undefined ||
      dto.hourlyRate !== undefined ||
      dto.dailyRate !== undefined ||
      dto.standardHours !== undefined ||
      dto.overtimeMultiplier !== undefined ||
      dto.pfDeduction !== undefined ||
      dto.taxDeduction !== undefined;

    const updated = await this.prisma.$transaction(async (tx: any) => {
      if (hasCompChange) {
        const salaryData = this.buildSalaryData(nextSalaryType, dto, existing.salaryStructure);
        if (salaryData) {
          await tx.salaryStructure.upsert({
            where: { employeeId: id },
            create: { tenantId, employeeId: id, ...salaryData, currency: 'INR' },
            update: salaryData
          });
        }
      }

      return tx.employee.update({
        where: { id },
        data,
        include: {
          salaryStructure: true,
          reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } }
        }
      });
    });

    return this.mapToDto(updated);
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.tenantClient.employee.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return this.prisma.tenantClient.employee.delete({
      where: { id }
    });
  }

  private mapToDto(emp: any): EmployeeDto {
    return {
      id: emp.id,
      tenantId: emp.tenantId,
      userId: emp.userId,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      designation: emp.designation,
      branch: emp.branch,
      departmentId: emp.departmentId,
      designationId: emp.designationId,
      branchId: emp.branchId,
      shiftId: emp.shiftId,
      employmentTypeId: emp.employmentTypeId,
      reportingManagerId: emp.reportingManagerId || null,
      reportingManagerName: emp.reportingManager
        ? `${emp.reportingManager.firstName} ${emp.reportingManager.lastName}`
        : null,
      reportingManagerCode: emp.reportingManager?.employeeCode || null,
      salaryType: emp.salaryType || 'MONTHLY_FIXED',
      joiningDate: emp.joiningDate instanceof Date ? emp.joiningDate.toISOString() : emp.joiningDate,
      status: emp.status,
      createdAt: emp.createdAt instanceof Date ? emp.createdAt.toISOString() : emp.createdAt,
      salaryStructure: emp.salaryStructure ? {
        id: emp.salaryStructure.id,
        employeeId: emp.salaryStructure.employeeId,
        basicSalary: emp.salaryStructure.basicSalary,
        hra: emp.salaryStructure.hra,
        specialAllowance: emp.salaryStructure.specialAllowance,
        conveyanceAllowance: emp.salaryStructure.conveyanceAllowance,
        hourlyRate: emp.salaryStructure.hourlyRate ?? 0,
        dailyRate: emp.salaryStructure.dailyRate ?? 0,
        standardHours: emp.salaryStructure.standardHours ?? 160,
        overtimeMultiplier: emp.salaryStructure.overtimeMultiplier ?? 1.5,
        pfDeduction: emp.salaryStructure.pfDeduction,
        taxDeduction: emp.salaryStructure.taxDeduction,
        otherDeductions: emp.salaryStructure.otherDeductions,
        grossSalary: emp.salaryStructure.grossSalary,
        netSalary: emp.salaryStructure.netSalary,
        currency: emp.salaryStructure.currency,
        effectiveDate: emp.salaryStructure.effectiveDate instanceof Date ? emp.salaryStructure.effectiveDate.toISOString() : emp.salaryStructure.effectiveDate
      } : null
    };
  }

  private buildSalaryData(
    salaryType: string,
    dto: Partial<CreateEmployeeRequest> | Partial<UpdateEmployeeRequest>,
    existing?: any
  ) {
    const pf = Number(dto.pfDeduction ?? existing?.pfDeduction ?? 0);
    const tax = Number(dto.taxDeduction ?? existing?.taxDeduction ?? 0);
    const otherDeductions = Number(existing?.otherDeductions ?? 0);

    if (salaryType === SalaryType.HOURLY) {
      const hourlyRate = Number(dto.hourlyRate ?? existing?.hourlyRate ?? 0);
      const standardHours = Number(dto.standardHours ?? existing?.standardHours ?? 160);
      const overtimeMultiplier = Number(dto.overtimeMultiplier ?? existing?.overtimeMultiplier ?? 1.5);
      if (hourlyRate <= 0 && !existing) return null;
      const gross = Math.round(hourlyRate * standardHours);
      return {
        basicSalary: 0,
        hra: 0,
        specialAllowance: 0,
        conveyanceAllowance: 0,
        hourlyRate,
        dailyRate: 0,
        standardHours,
        overtimeMultiplier,
        pfDeduction: pf,
        taxDeduction: tax,
        otherDeductions,
        grossSalary: gross,
        netSalary: gross - (pf + tax + otherDeductions),
      };
    }

    if (salaryType === SalaryType.DAILY_WAGE) {
      const dailyRate = Number(dto.dailyRate ?? existing?.dailyRate ?? 0);
      const standardHours = Number(dto.standardHours ?? existing?.standardHours ?? 26);
      if (dailyRate <= 0 && !existing) return null;
      const gross = Math.round(dailyRate * standardHours);
      return {
        basicSalary: 0,
        hra: 0,
        specialAllowance: 0,
        conveyanceAllowance: 0,
        hourlyRate: 0,
        dailyRate,
        standardHours,
        overtimeMultiplier: 1.5,
        pfDeduction: pf,
        taxDeduction: tax,
        otherDeductions,
        grossSalary: gross,
        netSalary: gross - (pf + tax + otherDeductions),
      };
    }

    if (salaryType === SalaryType.PIECE_RATE) {
      return null;
    }

    const basic = Number(dto.basicSalary ?? existing?.basicSalary ?? 0);
    if (basic <= 0 && !existing) return null;
    const hra = Number(dto.hra ?? existing?.hra ?? 0);
    const special = Number(dto.specialAllowance ?? existing?.specialAllowance ?? 0);
    const conveyance = Number(dto.conveyanceAllowance ?? existing?.conveyanceAllowance ?? 0);
    const gross = basic + hra + special + conveyance;
    return {
      basicSalary: basic,
      hra,
      specialAllowance: special,
      conveyanceAllowance: conveyance,
      hourlyRate: 0,
      dailyRate: 0,
      standardHours: 0,
      overtimeMultiplier: 1.5,
      pfDeduction: pf,
      taxDeduction: tax,
      otherDeductions,
      grossSalary: gross,
      netSalary: gross - (pf + tax + otherDeductions),
    };
  }

  private async validateReportingManager(
    tenantId: string,
    employeeId: string | null,
    reportingManagerId: string,
    txClient?: any
  ) {
    if (employeeId && employeeId === reportingManagerId) {
      throw new BadRequestException('An employee cannot be assigned as their own reporting manager');
    }

    const client = txClient || this.prisma;
    const manager = await client.employee.findFirst({
      where: { id: reportingManagerId, tenantId },
      select: { id: true, reportingManagerId: true }
    });

    if (!manager) {
      throw new BadRequestException('Selected reporting manager does not belong to this tenant');
    }

    if (employeeId) {
      const visited = new Set<string>([reportingManagerId]);
      let cursor = manager.reportingManagerId;
      for (let depth = 0; depth < 25 && cursor; depth++) {
        if (cursor === employeeId) {
          throw new BadRequestException('Invalid reporting hierarchy: circular reporting manager assignment detected');
        }
        if (visited.has(cursor)) break;
        visited.add(cursor);
        const parent = await client.employee.findFirst({
          where: { id: cursor, tenantId },
          select: { reportingManagerId: true }
        });
        cursor = parent?.reportingManagerId || null;
      }
    }
  }

  private async attachPortalUserInTx(
    tx: any,
    tenantId: string,
    employee: any,
    opts: { email?: string; password: string; roleCode?: string }
  ) {
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    const fallbackSlug = tenant?.slug || 'company';
    const rawEmail = opts.email || employee.email || `${employee.employeeCode.toLowerCase()}@${fallbackSlug}.peoplehub.local`;
    const loginEmail = rawEmail.trim().toLowerCase();

    if (!opts.password || opts.password.length < 4) {
      throw new BadRequestException('Portal password must be at least 4 characters');
    }

    const passwordHash = await bcrypt.hash(opts.password, 12);
    let targetUserId = employee.userId;

    if (targetUserId) {
      const existingOwner = await tx.employee.findFirst({
        where: { tenantId, userId: targetUserId, id: { not: employee.id } }
      });
      if (existingOwner) {
        throw new ConflictException('This user account is already linked to another employee');
      }
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          passwordHash,
          status: 'ACTIVE',
          ...(opts.email ? { email: loginEmail } : {})
        }
      });
    } else {
      let user = await tx.user.findUnique({ where: { email: loginEmail } });
      if (user) {
        const linkedToAnotherEmp = await tx.employee.findFirst({
          where: { tenantId, userId: user.id, id: { not: employee.id } }
        });
        if (linkedToAnotherEmp) {
          throw new ConflictException(`Email ${loginEmail} is already linked to employee ${linkedToAnotherEmp.employeeCode}`);
        }
        user = await tx.user.update({
          where: { id: user.id },
          data: { passwordHash, status: 'ACTIVE' }
        });
      } else {
        user = await tx.user.create({
          data: {
            email: loginEmail,
            passwordHash,
            firstName: employee.firstName,
            lastName: employee.lastName,
            status: 'ACTIVE'
          }
        });
      }
      targetUserId = user.id;
    }

    await tx.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: targetUserId
        }
      },
      update: { status: 'ACTIVE' },
      create: {
        tenantId,
        userId: targetUserId,
        status: 'ACTIVE'
      }
    });

    const desiredRoleCode = (opts.roleCode || 'EMPLOYEE').trim().toUpperCase();
    let role = await tx.role.findFirst({
      where: {
        tenantId,
        OR: [{ code: desiredRoleCode }, { name: desiredRoleCode }]
      }
    });

    if (!role) {
      role = await tx.role.create({
        data: {
          tenantId,
          code: desiredRoleCode,
          name: desiredRoleCode === 'EMPLOYEE' ? 'Employee' : desiredRoleCode,
          description: 'Employee self-service role for leave availability, requests, and manager approvals',
          isSystem: desiredRoleCode === 'EMPLOYEE'
        }
      });
      const defaultEmpPerms = await tx.permission.findMany({
        where: { code: { in: ['LEAVE_VIEW', 'LEAVE_APPLY'] } }
      });
      if (defaultEmpPerms.length > 0) {
        await tx.rolePermission.createMany({
          data: defaultEmpPerms.map((p: any) => ({ roleId: role.id, permissionCode: p.code })),
          skipDuplicates: true
        });
      }
    }

    const existingAssignment = await tx.userRoleAssignment.findFirst({
      where: {
        tenantId,
        userId: targetUserId,
        roleId: role.id
      }
    });

    if (!existingAssignment) {
      await tx.userRoleAssignment.create({
        data: {
          tenantId,
          userId: targetUserId,
          roleId: role.id,
          scopeType: 'TENANT',
          scopeId: null
        }
      });
    }

    return tx.employee.update({
      where: { id: employee.id },
      data: {
        userId: targetUserId,
        email: employee.email || loginEmail
      }
    });
  }

  async provisionPortalLogin(
    tenantId: string,
    id: string,
    dto: ProvisionEmployeeLoginRequest
  ): Promise<EmployeeDto> {
    const existing = await this.prisma.tenantClient.employee.findFirst({
      where: { id, tenantId },
      include: {
        salaryStructure: true,
        reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } }
      }
    });

    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const emp = await this.attachPortalUserInTx(tx, tenantId, existing, {
        email: dto.email,
        password: dto.password,
        roleCode: dto.roleCode || 'EMPLOYEE'
      });

      return tx.employee.findUnique({
        where: { id: emp.id },
        include: {
          salaryStructure: true,
          reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } }
        }
      });
    });

    return this.mapToDto(updated);
  }
}
