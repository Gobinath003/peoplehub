import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmployeeDto,
  LeaveTypeDto,
  CreateLeaveTypeRequest,
  UpdateLeaveTypeRequest,
  EmployeeLeaveBalanceDto,
  AdjustLeaveBalanceRequest,
  LeaveRequestDto,
  ApplyLeaveRequest,
  ActionLeaveRequest,
  LeaveWorkspaceSummaryDto,
  LeaveAccrualType,
  LeaveRequestStatus,
  HalfDaySession,
} from '@people-hub/shared-types';

interface CallerContext {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  roleCodes: Set<string>;
  permissionCodes: Set<string>;
  canManageLeaveTypes: boolean;
  canApproveAllLeaves: boolean;
  employee: any | null;
}

const DEFAULT_LEAVE_TYPES = [
  {
    code: 'CL',
    name: 'Casual Leave',
    description: 'Short-term personal leave for urgent or planned personal matters.',
    annualQuota: 12,
    accrualType: LeaveAccrualType.ANNUAL_UPFRONT,
    carryForwardLimit: 0,
    maxConsecutiveDays: 5,
    minNoticeDays: 0,
    allowHalfDay: true,
    isPaid: true,
    requiresDocument: false,
    applicableGender: 'ALL',
    colorHex: '#0EA5E9',
    isActive: true,
  },
  {
    code: 'SL',
    name: 'Sick Leave',
    description: 'Medical and recovery leave for health reasons or hospitalization.',
    annualQuota: 8,
    accrualType: LeaveAccrualType.ANNUAL_UPFRONT,
    carryForwardLimit: 4,
    maxConsecutiveDays: 10,
    minNoticeDays: 0,
    allowHalfDay: true,
    isPaid: true,
    requiresDocument: false,
    applicableGender: 'ALL',
    colorHex: '#F43F5E',
    isActive: true,
  },
  {
    code: 'EL',
    name: 'Earned Leave',
    description: 'Privilege / annual vacation leave eligible for year-end carry forward.',
    annualQuota: 15,
    accrualType: LeaveAccrualType.MONTHLY_ACCRUAL,
    carryForwardLimit: 15,
    maxConsecutiveDays: 15,
    minNoticeDays: 3,
    allowHalfDay: false,
    isPaid: true,
    requiresDocument: false,
    applicableGender: 'ALL',
    colorHex: '#10B981',
    isActive: true,
  },
  {
    code: 'LOP',
    name: 'Loss of Pay (Unpaid)',
    description: 'Unpaid leave when paid leave quotas are exhausted.',
    annualQuota: 0,
    accrualType: LeaveAccrualType.ON_DEMAND,
    carryForwardLimit: 0,
    maxConsecutiveDays: 30,
    minNoticeDays: 0,
    allowHalfDay: true,
    isPaid: false,
    requiresDocument: false,
    applicableGender: 'ALL',
    colorHex: '#64748B',
    isActive: true,
  },
];

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  private normalizeUtcDate(input: string | Date): Date {
    const d = typeof input === 'string' ? new Date(input.includes('T') ? input : `${input}T00:00:00.000Z`) : new Date(input);
    if (isNaN(d.getTime())) {
      throw new BadRequestException('Invalid date supplied');
    }
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private async getCallerContext(tenantId: string, user: any): Promise<CallerContext> {
    const userId = user?.userId || user?.id || user?.sub;
    const email = (user?.email || '').toLowerCase();
    const isSuperAdmin = email === 'admin@peoplehub.com';

    const roleCodes = new Set<string>();
    const permissionCodes = new Set<string>();

    if (Array.isArray(user?.roles)) {
      for (const r of user.roles) {
        const code = typeof r === 'string' ? r : r?.code || r?.roleCode || r?.role?.code || r?.name;
        if (code) roleCodes.add(String(code).toUpperCase());
      }
    }
    if (Array.isArray(user?.permissions)) {
      for (const p of user.permissions) {
        if (p) permissionCodes.add(String(p).toUpperCase());
      }
    }

    if (userId) {
      const assignments = await this.prisma.userRoleAssignment.findMany({
        where: { tenantId, userId },
        include: {
          role: {
            include: {
              rolePermissions: true,
            },
          },
        },
      });
      for (const a of assignments) {
        if (a.role?.code) roleCodes.add(a.role.code.toUpperCase());
        for (const rp of a.role?.rolePermissions || []) {
          permissionCodes.add(rp.permissionCode.toUpperCase());
        }
      }
    }

    const employee = userId
      ? await this.prisma.employee.findFirst({
          where: { tenantId, userId },
          include: {
            salaryStructure: true,
            reportingManager: {
              select: { id: true, employeeCode: true, firstName: true, lastName: true, designation: true },
            },
          },
        })
      : null;

    const canManageLeaveTypes =
      isSuperAdmin ||
      roleCodes.has('TENANT_ADMIN') ||
      roleCodes.has('HR_MANAGER') ||
      permissionCodes.has('LEAVE_MANAGE');

    const canApproveAllLeaves =
      canManageLeaveTypes || permissionCodes.has('LEAVE_APPROVE');

    return {
      userId,
      email,
      isSuperAdmin,
      roleCodes,
      permissionCodes,
      canManageLeaveTypes,
      canApproveAllLeaves,
      employee,
    };
  }

  private async ensureDefaultLeaveTypes(tenantId: string) {
    const count = await this.prisma.leaveType.count({ where: { tenantId } });
    if (count > 0) return;

    await this.prisma.leaveType.createMany({
      data: DEFAULT_LEAVE_TYPES.map((lt) => ({ tenantId, ...lt })),
      skipDuplicates: true,
    });
  }

  private async ensureEmployeeBalancesForYear(tenantId: string, employeeId: string, year: number) {
    await this.ensureDefaultLeaveTypes(tenantId);
    const activeTypes = await this.prisma.leaveType.findMany({
      where: { tenantId, isActive: true },
    });

    for (const lt of activeTypes) {
      await this.prisma.employeeLeaveBalance.upsert({
        where: {
          tenantId_employeeId_leaveTypeId_year: {
            tenantId,
            employeeId,
            leaveTypeId: lt.id,
            year,
          },
        },
        update: {},
        create: {
          tenantId,
          employeeId,
          leaveTypeId: lt.id,
          year,
          allocated: lt.annualQuota,
          carryForward: 0,
          used: 0,
          pending: 0,
        },
      });
    }
  }

  private mapEmployeeDto(emp: any): EmployeeDto {
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
      salaryType: emp.salaryType,
      joiningDate: emp.joiningDate instanceof Date ? emp.joiningDate.toISOString() : emp.joiningDate,
      status: emp.status,
      createdAt: emp.createdAt instanceof Date ? emp.createdAt.toISOString() : emp.createdAt,
      salaryStructure: emp.salaryStructure
        ? {
            id: emp.salaryStructure.id,
            employeeId: emp.salaryStructure.employeeId,
            basicSalary: emp.salaryStructure.basicSalary,
            hra: emp.salaryStructure.hra,
            specialAllowance: emp.salaryStructure.specialAllowance,
            conveyanceAllowance: emp.salaryStructure.conveyanceAllowance,
            pfDeduction: emp.salaryStructure.pfDeduction,
            taxDeduction: emp.salaryStructure.taxDeduction,
            otherDeductions: emp.salaryStructure.otherDeductions,
            grossSalary: emp.salaryStructure.grossSalary,
            netSalary: emp.salaryStructure.netSalary,
            currency: emp.salaryStructure.currency,
            effectiveDate:
              emp.salaryStructure.effectiveDate instanceof Date
                ? emp.salaryStructure.effectiveDate.toISOString()
                : emp.salaryStructure.effectiveDate,
          }
        : null,
    };
  }

  private mapLeaveType(lt: any): LeaveTypeDto {
    return {
      id: lt.id,
      tenantId: lt.tenantId,
      code: lt.code,
      name: lt.name,
      description: lt.description || null,
      annualQuota: Number(lt.annualQuota || 0),
      accrualType: lt.accrualType as LeaveAccrualType,
      carryForwardLimit: Number(lt.carryForwardLimit || 0),
      isPaid: Boolean(lt.isPaid),
      requiresApproval: true,
      allowHalfDay: Boolean(lt.allowHalfDay),
      minNoticeDays: Number(lt.minNoticeDays || 0),
      maxConsecutiveDays: lt.maxConsecutiveDays ?? null,
      applicableGender: lt.applicableGender || 'ALL',
      color: lt.colorHex || '#10B981',
      isActive: Boolean(lt.isActive),
      createdAt: lt.createdAt instanceof Date ? lt.createdAt.toISOString() : lt.createdAt,
      updatedAt: lt.updatedAt instanceof Date ? lt.updatedAt.toISOString() : lt.updatedAt,
    };
  }

  private mapBalance(b: any): EmployeeLeaveBalanceDto {
    const totalEntitled = Number(b.allocated || 0) + Number(b.carryForward || 0);
    const used = Number(b.used || 0);
    const pending = Number(b.pending || 0);
    const isPaid = b.leaveType?.isPaid !== false;
    const available = isPaid ? Math.max(0, totalEntitled - used - pending) : Math.max(0, totalEntitled - used - pending);

    return {
      id: b.id,
      tenantId: b.tenantId,
      employeeId: b.employeeId,
      employeeCode: b.employee?.employeeCode,
      employeeName: b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : undefined,
      department: b.employee?.department,
      leaveTypeId: b.leaveTypeId,
      leaveTypeCode: b.leaveType?.code || '',
      leaveTypeName: b.leaveType?.name || '',
      leaveTypeColor: b.leaveType?.colorHex || '#10B981',
      isPaid,
      allowHalfDay: b.leaveType?.allowHalfDay !== false,
      year: b.year,
      allocated: Number(b.allocated || 0),
      carryForward: Number(b.carryForward || 0),
      used,
      pending,
      available,
    };
  }

  private mapRequest(req: any): LeaveRequestDto {
    return {
      id: req.id,
      tenantId: req.tenantId,
      employeeId: req.employeeId,
      employeeCode: req.employee?.employeeCode || '',
      employeeName: req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : '',
      employeeDepartment: req.employee?.department || '',
      employeeDesignation: req.employee?.designation || '',
      leaveTypeId: req.leaveTypeId,
      leaveTypeCode: req.leaveType?.code || '',
      leaveTypeName: req.leaveType?.name || '',
      leaveTypeColor: req.leaveType?.colorHex || '#10B981',
      isPaid: req.leaveType?.isPaid !== false,
      approverId: req.approverId || req.employee?.reportingManagerId || null,
      approverName: req.approver
        ? `${req.approver.firstName} ${req.approver.lastName}`
        : req.employee?.reportingManager
        ? `${req.employee.reportingManager.firstName} ${req.employee.reportingManager.lastName}`
        : null,
      approverCode: req.approver?.employeeCode || req.employee?.reportingManager?.employeeCode || null,
      startDate: req.startDate instanceof Date ? req.startDate.toISOString() : req.startDate,
      endDate: req.endDate instanceof Date ? req.endDate.toISOString() : req.endDate,
      totalDays: Number(req.totalDays),
      isHalfDay: Boolean(req.isHalfDay),
      halfDaySession: (req.halfDaySession as HalfDaySession) || null,
      reason: req.reason,
      handoverNotes: req.handoverNotes || null,
      emergencyContact: req.emergencyContact || null,
      status: req.status as LeaveRequestStatus,
      approverRemarks: req.approverRemarks || null,
      actionedByUserId: req.actionedByUserId || null,
      appliedAt: req.appliedAt instanceof Date ? req.appliedAt.toISOString() : req.appliedAt,
      actionedAt: req.actionedAt instanceof Date ? req.actionedAt.toISOString() : req.actionedAt || null,
      createdAt: req.createdAt instanceof Date ? req.createdAt.toISOString() : req.createdAt,
    };
  }

  async getWorkspaceSummary(tenantId: string, user: any, year?: number): Promise<LeaveWorkspaceSummaryDto> {
    const targetYear = year || new Date().getFullYear();
    await this.ensureDefaultLeaveTypes(tenantId);
    const caller = await this.getCallerContext(tenantId, user);

    const leaveTypes = await this.prisma.leaveType.findMany({
      where: caller.canManageLeaveTypes ? { tenantId } : { tenantId, isActive: true },
      orderBy: [{ isActive: 'desc' }, { isPaid: 'desc' }, { code: 'asc' }],
    });

    let balancesList: EmployeeLeaveBalanceDto[] = [];
    let myRequests: LeaveRequestDto[] = [];
    let teamRequests: LeaveRequestDto[] = [];
    let directReportsCount = 0;

    if (caller.employee) {
      await this.ensureEmployeeBalancesForYear(tenantId, caller.employee.id, targetYear);

      const balances = await this.prisma.employeeLeaveBalance.findMany({
        where: { tenantId, employeeId: caller.employee.id, year: targetYear },
        include: { employee: true, leaveType: true },
        orderBy: { leaveType: { code: 'asc' } },
      });
      balancesList = balances.filter((b: any) => b.leaveType?.isActive).map((b: any) => this.mapBalance(b));

      const ownRequests = await this.prisma.leaveRequest.findMany({
        where: { tenantId, employeeId: caller.employee.id },
        include: {
          employee: { include: { reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } } },
          leaveType: true,
          approver: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        },
        orderBy: { appliedAt: 'desc' },
      });
      myRequests = ownRequests.map((r: any) => this.mapRequest(r));

      directReportsCount = await this.prisma.employee.count({
        where: { tenantId, reportingManagerId: caller.employee.id, status: { not: 'TERMINATED' } },
      });

      const rawTeamRequests = await this.prisma.leaveRequest.findMany({
        where: {
          tenantId,
          employeeId: { not: caller.employee.id },
          OR: [
            { approverId: caller.employee.id },
            { employee: { reportingManagerId: caller.employee.id } },
          ],
        },
        include: {
          employee: { include: { reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } } },
          leaveType: true,
          approver: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        },
        orderBy: { appliedAt: 'desc' },
      });
      teamRequests = rawTeamRequests.map((r: any) => this.mapRequest(r));
    }

    let allRequests: LeaveRequestDto[] = [];
    if (caller.canApproveAllLeaves) {
      const orgReqs = await this.prisma.leaveRequest.findMany({
        where: { tenantId },
        include: {
          employee: { include: { reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } } },
          leaveType: true,
          approver: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 250,
      });
      allRequests = orgReqs.map((r: any) => this.mapRequest(r));
    }

    const mgr = caller.employee?.reportingManager;

    return {
      year: targetYear,
      currentEmployee: caller.employee ? this.mapEmployeeDto(caller.employee) : null,
      reportingManager: mgr
        ? {
            id: mgr.id,
            employeeCode: mgr.employeeCode,
            name: `${mgr.firstName} ${mgr.lastName}`,
            designation: mgr.designation || 'Reporting Manager',
          }
        : null,
      isManager: directReportsCount > 0 || teamRequests.length > 0 || caller.canApproveAllLeaves,
      isAdmin: caller.canManageLeaveTypes,
      directReportsCount,
      leaveTypes: leaveTypes.map((lt: any) => this.mapLeaveType(lt)),
      balances: balancesList,
      myRequests,
      teamRequests,
      allRequests,
    };
  }

  async listLeaveTypes(tenantId: string, includeInactive = true): Promise<LeaveTypeDto[]> {
    await this.ensureDefaultLeaveTypes(tenantId);
    const items = await this.prisma.leaveType.findMany({
      where: includeInactive ? { tenantId } : { tenantId, isActive: true },
      orderBy: [{ isActive: 'desc' }, { isPaid: 'desc' }, { code: 'asc' }],
    });
    return items.map((lt: any) => this.mapLeaveType(lt));
  }

  async createLeaveType(tenantId: string, user: any, dto: CreateLeaveTypeRequest): Promise<LeaveTypeDto> {
    const caller = await this.getCallerContext(tenantId, user);
    if (!caller.canManageLeaveTypes) {
      throw new ForbiddenException('Only Tenant Admin or HR Manager can create leave type masters');
    }

    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.leaveType.findFirst({ where: { tenantId, code } });
    if (existing) {
      throw new ConflictException(`Leave type code ${code} already exists for this company`);
    }

    const annualQuota = Number(dto.annualQuota ?? 0);
    if (annualQuota < 0) {
      throw new BadRequestException('Annual leave quota cannot be negative');
    }

    const created = await this.prisma.$transaction(async (tx: any) => {
      const lt = await tx.leaveType.create({
        data: {
          tenantId,
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          annualQuota,
          accrualType: dto.accrualType || LeaveAccrualType.ANNUAL_UPFRONT,
          carryForwardLimit: Number(dto.carryForwardLimit ?? 0),
          maxConsecutiveDays:
            dto.maxConsecutiveDays !== undefined && dto.maxConsecutiveDays !== null
              ? Number(dto.maxConsecutiveDays)
              : null,
          minNoticeDays: Number(dto.minNoticeDays ?? 0),
          allowHalfDay: dto.allowHalfDay !== undefined ? Boolean(dto.allowHalfDay) : true,
          isPaid: dto.isPaid !== undefined ? Boolean(dto.isPaid) : true,
          requiresDocument: false,
          applicableGender: dto.applicableGender || 'ALL',
          colorHex: dto.color || '#10B981',
          isActive: true,
        },
      });

      const year = new Date().getFullYear();
      const employees = await tx.employee.findMany({
        where: { tenantId, status: { not: 'TERMINATED' } },
        select: { id: true },
      });
      if (employees.length > 0) {
        await tx.employeeLeaveBalance.createMany({
          data: employees.map((e: any) => ({
            tenantId,
            employeeId: e.id,
            leaveTypeId: lt.id,
            year,
            allocated: lt.annualQuota,
            carryForward: 0,
            used: 0,
            pending: 0,
          })),
          skipDuplicates: true,
        });
      }

      return lt;
    });

    return this.mapLeaveType(created);
  }

  async updateLeaveType(tenantId: string, user: any, id: string, dto: UpdateLeaveTypeRequest): Promise<LeaveTypeDto> {
    const caller = await this.getCallerContext(tenantId, user);
    if (!caller.canManageLeaveTypes) {
      throw new ForbiddenException('Only Tenant Admin or HR Manager can update leave type masters');
    }

    const existing = await this.prisma.leaveType.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Leave type master not found');
    }

    const newQuota = dto.annualQuota !== undefined ? Number(dto.annualQuota) : existing.annualQuota;
    if (newQuota < 0) {
      throw new BadRequestException('Annual leave quota cannot be negative');
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const nextCode = dto.code ? dto.code.trim().toUpperCase() : existing.code;
      if (nextCode !== existing.code) {
        const dup = await tx.leaveType.findFirst({ where: { tenantId, code: nextCode, id: { not: id } } });
        if (dup) throw new ConflictException(`Leave type code ${nextCode} already exists`);
      }

      const lt = await tx.leaveType.update({
        where: { id },
        data: {
          code: nextCode,
          name: dto.name !== undefined ? dto.name.trim() : existing.name,
          description: dto.description !== undefined ? (dto.description?.trim() || null) : existing.description,
          annualQuota: newQuota,
          accrualType: dto.accrualType ?? existing.accrualType,
          carryForwardLimit:
            dto.carryForwardLimit !== undefined ? Number(dto.carryForwardLimit) : existing.carryForwardLimit,
          maxConsecutiveDays:
            dto.maxConsecutiveDays !== undefined
              ? (dto.maxConsecutiveDays !== null ? Number(dto.maxConsecutiveDays) : null)
              : existing.maxConsecutiveDays,
          minNoticeDays: dto.minNoticeDays !== undefined ? Number(dto.minNoticeDays) : existing.minNoticeDays,
          allowHalfDay: dto.allowHalfDay !== undefined ? Boolean(dto.allowHalfDay) : existing.allowHalfDay,
          isPaid: dto.isPaid !== undefined ? Boolean(dto.isPaid) : existing.isPaid,
          applicableGender: dto.applicableGender ?? existing.applicableGender,
          colorHex: dto.color ?? existing.colorHex,
          isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : existing.isActive,
        },
      });

      const currentYear = new Date().getFullYear();
      if (newQuota !== existing.annualQuota) {
        if (dto.syncExistingBalances === true) {
          await tx.employeeLeaveBalance.updateMany({
            where: { tenantId, leaveTypeId: id, year: currentYear },
            data: { allocated: newQuota },
          });
        } else {
          await tx.employeeLeaveBalance.updateMany({
            where: { tenantId, leaveTypeId: id, year: currentYear, allocated: existing.annualQuota },
            data: { allocated: newQuota },
          });
        }
      }

      if (lt.isActive) {
        const employees = await tx.employee.findMany({
          where: { tenantId, status: { not: 'TERMINATED' } },
          select: { id: true },
        });
        if (employees.length > 0) {
          await tx.employeeLeaveBalance.createMany({
            data: employees.map((e: any) => ({
              tenantId,
              employeeId: e.id,
              leaveTypeId: id,
              year: currentYear,
              allocated: newQuota,
              carryForward: 0,
              used: 0,
              pending: 0,
            })),
            skipDuplicates: true,
          });
        }
      }

      return lt;
    });

    return this.mapLeaveType(updated);
  }

  async deleteLeaveType(tenantId: string, user: any, id: string) {
    const caller = await this.getCallerContext(tenantId, user);
    if (!caller.canManageLeaveTypes) {
      throw new ForbiddenException('Only Tenant Admin or HR Manager can delete leave type masters');
    }

    const existing = await this.prisma.leaveType.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Leave type master not found');
    }

    const linkedRequests = await this.prisma.leaveRequest.count({ where: { tenantId, leaveTypeId: id } });
    if (linkedRequests > 0) {
      const archived = await this.prisma.leaveType.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        archived: true,
        message: 'Leave type has historical applications, so it was marked inactive instead of deleted.',
        leaveType: this.mapLeaveType(archived),
      };
    }

    await this.prisma.leaveType.delete({ where: { id } });
    return { deleted: true, id };
  }

  async listBalances(tenantId: string, user: any, year?: number, employeeId?: string): Promise<EmployeeLeaveBalanceDto[]> {
    const targetYear = year || new Date().getFullYear();
    const caller = await this.getCallerContext(tenantId, user);
    await this.ensureDefaultLeaveTypes(tenantId);

    if (!caller.canManageLeaveTypes && !caller.canApproveAllLeaves) {
      if (!caller.employee) return [];
      await this.ensureEmployeeBalancesForYear(tenantId, caller.employee.id, targetYear);
      const own = await this.prisma.employeeLeaveBalance.findMany({
        where: { tenantId, employeeId: caller.employee.id, year: targetYear },
        include: { employee: true, leaveType: true },
        orderBy: { leaveType: { code: 'asc' } },
      });
      return own.map((b: any) => this.mapBalance(b));
    }

    const empWhere: any = { tenantId, status: { not: 'TERMINATED' } };
    if (employeeId) empWhere.id = employeeId;

    const employees = await this.prisma.employee.findMany({
      where: empWhere,
      select: { id: true },
    });
    for (const emp of employees) {
      await this.ensureEmployeeBalancesForYear(tenantId, emp.id, targetYear);
    }

    const balances = await this.prisma.employeeLeaveBalance.findMany({
      where: {
        tenantId,
        year: targetYear,
        ...(employeeId ? { employeeId } : {}),
      },
      include: { employee: true, leaveType: true },
      orderBy: [{ employee: { employeeCode: 'asc' } }, { leaveType: { code: 'asc' } }],
    });

    return balances.map((b: any) => this.mapBalance(b));
  }

  async syncYearBalances(tenantId: string, user: any, year?: number, overwriteAllocated = false) {
    const caller = await this.getCallerContext(tenantId, user);
    if (!caller.canManageLeaveTypes) {
      throw new ForbiddenException('Only Tenant Admin or HR Manager can allocate/sync leave balances');
    }

    const targetYear = year || new Date().getFullYear();
    await this.ensureDefaultLeaveTypes(tenantId);

    const activeTypes = await this.prisma.leaveType.findMany({ where: { tenantId, isActive: true } });
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: { not: 'TERMINATED' } },
      select: { id: true },
    });

    let syncedCount = 0;
    await this.prisma.$transaction(async (tx: any) => {
      for (const emp of employees) {
        for (const lt of activeTypes) {
          await tx.employeeLeaveBalance.upsert({
            where: {
              tenantId_employeeId_leaveTypeId_year: {
                tenantId,
                employeeId: emp.id,
                leaveTypeId: lt.id,
                year: targetYear,
              },
            },
            update: overwriteAllocated ? { allocated: lt.annualQuota } : {},
            create: {
              tenantId,
              employeeId: emp.id,
              leaveTypeId: lt.id,
              year: targetYear,
              allocated: lt.annualQuota,
              carryForward: 0,
              used: 0,
              pending: 0,
            },
          });
          syncedCount++;
        }
      }
    });

    return { year: targetYear, employeesCount: employees.length, syncedRecords: syncedCount };
  }

  async adjustBalance(tenantId: string, user: any, dto: AdjustLeaveBalanceRequest): Promise<EmployeeLeaveBalanceDto> {
    const caller = await this.getCallerContext(tenantId, user);
    if (!caller.canManageLeaveTypes) {
      throw new ForbiddenException('Only Tenant Admin or HR Manager can adjust employee leave balances');
    }

    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found in this tenant');

    const leaveType = await this.prisma.leaveType.findFirst({ where: { id: dto.leaveTypeId, tenantId } });
    if (!leaveType) throw new NotFoundException('Leave type not found in this tenant');

    const year = dto.year || new Date().getFullYear();
    await this.ensureEmployeeBalancesForYear(tenantId, employee.id, year);

    const updateData: any = {};
    if (dto.allocated !== undefined) {
      if (Number(dto.allocated) < 0) throw new BadRequestException('Allocated days cannot be negative');
      updateData.allocated = Number(dto.allocated);
    }
    if (dto.carryForward !== undefined) {
      if (Number(dto.carryForward) < 0) throw new BadRequestException('Carry forward days cannot be negative');
      updateData.carryForward = Number(dto.carryForward);
    }

    const updated = await this.prisma.employeeLeaveBalance.update({
      where: {
        tenantId_employeeId_leaveTypeId_year: {
          tenantId,
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year,
        },
      },
      data: updateData,
      include: { employee: true, leaveType: true },
    });

    return this.mapBalance(updated);
  }

  async listRequests(tenantId: string, user: any, scope = 'all'): Promise<LeaveRequestDto[]> {
    const caller = await this.getCallerContext(tenantId, user);

    let whereClause: any = { tenantId };
    if (scope === 'my') {
      if (!caller.employee) return [];
      whereClause.employeeId = caller.employee.id;
    } else if (scope === 'team') {
      if (!caller.employee) return [];
      whereClause = {
        tenantId,
        employeeId: { not: caller.employee.id },
        OR: [
          { approverId: caller.employee.id },
          { employee: { reportingManagerId: caller.employee.id } },
        ],
      };
    } else if (!caller.canApproveAllLeaves) {
      if (!caller.employee) return [];
      whereClause = {
        tenantId,
        OR: [
          { employeeId: caller.employee.id },
          { approverId: caller.employee.id },
          { employee: { reportingManagerId: caller.employee.id } },
        ],
      };
    }

    const reqs = await this.prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        employee: { include: { reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } } },
        leaveType: true,
        approver: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });

    return reqs.map((r: any) => this.mapRequest(r));
  }

  async applyLeave(tenantId: string, user: any, dto: ApplyLeaveRequest): Promise<LeaveRequestDto> {
    const caller = await this.getCallerContext(tenantId, user);

    let targetEmployee = caller.employee;
    if (dto.employeeId && dto.employeeId !== caller.employee?.id) {
      if (!caller.canManageLeaveTypes) {
        throw new ForbiddenException('You can only apply leave for your own employee profile');
      }
      targetEmployee = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, tenantId },
        include: {
          salaryStructure: true,
          reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true, designation: true } },
        },
      });
    }

    if (!targetEmployee) {
      throw new BadRequestException(
        'Your user account is not linked to an employee profile yet. Please contact HR or use Link Employee Profile.'
      );
    }

    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: dto.leaveTypeId, tenantId, isActive: true },
    });
    if (!leaveType) {
      throw new NotFoundException('Selected leave type was not found or is inactive');
    }

    const startDate = this.normalizeUtcDate(dto.startDate);
    const endDate = this.normalizeUtcDate(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('End date cannot be earlier than start date');
    }

    let totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    const isHalfDay = Boolean(dto.isHalfDay);

    if (isHalfDay) {
      if (!leaveType.allowHalfDay) {
        throw new BadRequestException(`${leaveType.name} does not permit half-day applications`);
      }
      if (startDate.getTime() !== endDate.getTime()) {
        throw new BadRequestException('Half-day leave must start and end on the same calendar date');
      }
      if (dto.halfDaySession !== HalfDaySession.FIRST_HALF && dto.halfDaySession !== HalfDaySession.SECOND_HALF) {
        throw new BadRequestException('Please choose First Half or Second Half session for half-day leave');
      }
      totalDays = 0.5;
    }

    if (leaveType.maxConsecutiveDays && totalDays > leaveType.maxConsecutiveDays) {
      throw new BadRequestException(
        `${leaveType.name} permits at most ${leaveType.maxConsecutiveDays} consecutive days per request`
      );
    }

    if (leaveType.minNoticeDays > 0 && !caller.canManageLeaveTypes) {
      const todayUtc = this.normalizeUtcDate(new Date());
      const noticeGiven = Math.floor((startDate.getTime() - todayUtc.getTime()) / 86400000);
      if (noticeGiven < leaveType.minNoticeDays) {
        throw new BadRequestException(
          `${leaveType.name} requires at least ${leaveType.minNoticeDays} days advance notice`
        );
      }
    }

    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        tenantId,
        employeeId: targetEmployee.id,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapping) {
      throw new ConflictException('You already have a pending or approved leave request overlapping these dates');
    }

    const targetYear = startDate.getUTCFullYear();
    await this.ensureEmployeeBalancesForYear(tenantId, targetEmployee.id, targetYear);

    const created = await this.prisma.$transaction(async (tx: any) => {
      const balance = await tx.employeeLeaveBalance.findUnique({
        where: {
          tenantId_employeeId_leaveTypeId_year: {
            tenantId,
            employeeId: targetEmployee.id,
            leaveTypeId: leaveType.id,
            year: targetYear,
          },
        },
      });

      if (!balance) {
        throw new BadRequestException('Leave balance could not be initialized for the target year');
      }

      if (leaveType.isPaid) {
        const available =
          Number(balance.allocated) + Number(balance.carryForward) - Number(balance.used) - Number(balance.pending);
        if (totalDays > available) {
          throw new BadRequestException(
            `Insufficient ${leaveType.name} balance: requested ${totalDays} day(s), available ${Math.max(0, available)} day(s)`
          );
        }
      }

      await tx.employeeLeaveBalance.update({
        where: { id: balance.id },
        data: { pending: Number(balance.pending) + totalDays },
      });

      return tx.leaveRequest.create({
        data: {
          tenantId,
          employeeId: targetEmployee.id,
          leaveTypeId: leaveType.id,
          approverId: targetEmployee.reportingManagerId || null,
          startDate,
          endDate,
          totalDays,
          isHalfDay,
          halfDaySession: isHalfDay ? dto.halfDaySession : null,
          reason: dto.reason.trim(),
          handoverNotes: dto.handoverNotes?.trim() || null,
          emergencyContact: dto.emergencyContact?.trim() || null,
          status: LeaveRequestStatus.PENDING,
        },
        include: {
          employee: { include: { reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } } },
          leaveType: true,
          approver: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        },
      });
    });

    return this.mapRequest(created);
  }

  private async reviewLeaveRequest(
    tenantId: string,
    user: any,
    requestId: string,
    decision: LeaveRequestStatus.APPROVED | LeaveRequestStatus.REJECTED,
    dto: ActionLeaveRequest
  ): Promise<LeaveRequestDto> {
    const caller = await this.getCallerContext(tenantId, user);

    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, tenantId },
      include: {
        employee: true,
        leaveType: true,
      },
    });
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(`Leave request has already been ${request.status.toLowerCase()}`);
    }

    if (caller.employee && caller.employee.id === request.employeeId && !caller.isSuperAdmin && !caller.roleCodes.has('TENANT_ADMIN')) {
      throw new ForbiddenException('You cannot approve or reject your own leave request');
    }

    const isDesignatedManager =
      caller.employee &&
      (request.approverId === caller.employee.id || request.employee?.reportingManagerId === caller.employee.id);

    if (!isDesignatedManager && !caller.canApproveAllLeaves) {
      throw new ForbiddenException('You are not the designated Reporting Manager or authorized HR approver for this request');
    }

    const targetYear = new Date(request.startDate).getUTCFullYear();

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const balance = await tx.employeeLeaveBalance.findUnique({
        where: {
          tenantId_employeeId_leaveTypeId_year: {
            tenantId,
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: targetYear,
          },
        },
      });

      if (balance) {
        const nextPending = Math.max(0, Number(balance.pending) - Number(request.totalDays));
        const nextUsed =
          decision === LeaveRequestStatus.APPROVED
            ? Number(balance.used) + Number(request.totalDays)
            : Number(balance.used);

        await tx.employeeLeaveBalance.update({
          where: { id: balance.id },
          data: {
            pending: nextPending,
            used: nextUsed,
          },
        });
      }

      return tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: decision,
          approverId: request.approverId || caller.employee?.id || null,
          actionedByUserId: caller.userId || null,
          approverRemarks: dto.remarks?.trim() || null,
          actionedAt: new Date(),
        },
        include: {
          employee: { include: { reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } } },
          leaveType: true,
          approver: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        },
      });
    });

    return this.mapRequest(updated);
  }

  async approveLeave(tenantId: string, user: any, requestId: string, dto: ActionLeaveRequest): Promise<LeaveRequestDto> {
    return this.reviewLeaveRequest(tenantId, user, requestId, LeaveRequestStatus.APPROVED, dto);
  }

  async rejectLeave(tenantId: string, user: any, requestId: string, dto: ActionLeaveRequest): Promise<LeaveRequestDto> {
    return this.reviewLeaveRequest(tenantId, user, requestId, LeaveRequestStatus.REJECTED, dto);
  }

  async cancelLeave(tenantId: string, user: any, requestId: string): Promise<LeaveRequestDto> {
    const caller = await this.getCallerContext(tenantId, user);
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, tenantId },
    });
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    const isOwner = caller.employee && caller.employee.id === request.employeeId;
    if (!isOwner && !caller.canManageLeaveTypes) {
      throw new ForbiddenException('You can only cancel your own leave requests');
    }

    if (request.status !== LeaveRequestStatus.PENDING && request.status !== LeaveRequestStatus.APPROVED) {
      throw new BadRequestException(`Cannot cancel a leave request that is already ${request.status.toLowerCase()}`);
    }

    const targetYear = new Date(request.startDate).getUTCFullYear();

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const balance = await tx.employeeLeaveBalance.findUnique({
        where: {
          tenantId_employeeId_leaveTypeId_year: {
            tenantId,
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: targetYear,
          },
        },
      });

      if (balance) {
        await tx.employeeLeaveBalance.update({
          where: { id: balance.id },
          data: {
            pending:
              request.status === LeaveRequestStatus.PENDING
                ? Math.max(0, Number(balance.pending) - Number(request.totalDays))
                : Number(balance.pending),
            used:
              request.status === LeaveRequestStatus.APPROVED
                ? Math.max(0, Number(balance.used) - Number(request.totalDays))
                : Number(balance.used),
          },
        });
      }

      return tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: LeaveRequestStatus.CANCELLED,
          actionedByUserId: caller.userId || null,
          actionedAt: new Date(),
        },
        include: {
          employee: { include: { reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } } },
          leaveType: true,
          approver: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        },
      });
    });

    return this.mapRequest(updated);
  }

  async linkEmployeeProfile(tenantId: string, user: any, employeeId?: string) {
    const caller = await this.getCallerContext(tenantId, user);
    if (!caller.userId) {
      throw new ForbiddenException('Authenticated user identity required');
    }
    if (!caller.canManageLeaveTypes) {
      throw new ForbiddenException('Only Tenant Admin or HR Manager can link an admin user to an employee profile');
    }

    const emp = employeeId
      ? await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId } })
      : await this.prisma.employee.findFirst({ where: { tenantId, email: caller.email } });

    if (!emp) {
      throw new NotFoundException('Matching employee profile not found in this tenant');
    }

    if (emp.userId && emp.userId !== caller.userId) {
      throw new ConflictException('That employee profile is already linked to a different login user');
    }

    await this.prisma.employee.updateMany({
      where: { tenantId, userId: caller.userId, id: { not: emp.id } },
      data: { userId: null },
    });

    const updated = await this.prisma.employee.update({
      where: { id: emp.id },
      data: { userId: caller.userId },
      include: {
        reportingManager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      },
    });

    await this.ensureEmployeeBalancesForYear(tenantId, updated.id, new Date().getFullYear());
    return {
      linked: true,
      employee: {
        id: updated.id,
        employeeCode: updated.employeeCode,
        firstName: updated.firstName,
        lastName: updated.lastName,
        department: updated.department,
        designation: updated.designation,
      },
    };
  }
}
