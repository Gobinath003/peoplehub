import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DepartmentDto,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DesignationDto,
  CreateDesignationRequest,
  UpdateDesignationRequest,
  BranchDto,
  CreateBranchRequest,
  UpdateBranchRequest,
  ShiftDto,
  CreateShiftRequest,
  UpdateShiftRequest,
  EmploymentTypeDto,
  CreateEmploymentTypeRequest,
  UpdateEmploymentTypeRequest,
  MasterBundleDto,
} from '@people-hub/shared-types';

@Injectable()
export class MastersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns all master tables for a tenant in a single bundle.
   * If tenant has no master data, automatically seeds tailored default records.
   */
  async getMasterBundle(tenantId: string): Promise<MasterBundleDto> {
    const deptCount = await this.prisma.tenantClient.department.count({ where: { tenantId } });
    if (deptCount === 0) {
      await this.seedTenantDefaults(tenantId);
    }

    const [departments, designations, branches, shifts, employmentTypes] = await Promise.all([
      this.listDepartments(tenantId),
      this.listDesignations(tenantId),
      this.listBranches(tenantId),
      this.listShifts(tenantId),
      this.listEmploymentTypes(tenantId),
    ]);

    return {
      departments,
      designations,
      branches,
      shifts,
      employmentTypes,
    };
  }

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  async listDepartments(tenantId: string): Promise<DepartmentDto[]> {
    const depts = await this.prisma.tenantClient.department.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return depts.map((d: any) => ({
      id: d.id,
      tenantId: d.tenantId,
      code: d.code,
      name: d.name,
      description: d.description,
      isActive: d.isActive,
      employeeCount: d._count?.employees || 0,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async createDepartment(tenantId: string, dto: CreateDepartmentRequest): Promise<DepartmentDto> {
    const existing = await this.prisma.tenantClient.department.findFirst({
      where: { tenantId, code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Department code "${dto.code}" already exists in this tenant`);
    }

    const dept = await this.prisma.tenantClient.department.create({
      data: {
        tenantId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        isActive: true,
      },
    });

    return {
      id: dept.id,
      tenantId: dept.tenantId,
      code: dept.code,
      name: dept.name,
      description: dept.description,
      isActive: dept.isActive,
      employeeCount: 0,
      createdAt: dept.createdAt.toISOString(),
    };
  }

  async updateDepartment(tenantId: string, id: string, dto: UpdateDepartmentRequest): Promise<DepartmentDto> {
    const existing = await this.prisma.tenantClient.department.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Department ${id} not found`);
    }

    const data: any = {};
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase();
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.tenantClient.department.update({
      where: { id },
      data,
      include: {
        _count: { select: { employees: true } },
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      employeeCount: updated._count?.employees || 0,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteDepartment(tenantId: string, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.tenantClient.department.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { employees: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Department ${id} not found`);
    }

    if (existing._count?.employees > 0) {
      throw new BadRequestException(`Cannot delete department with ${existing._count.employees} assigned employees`);
    }

    await this.prisma.tenantClient.department.delete({ where: { id } });
    return { success: true };
  }

  // ==========================================
  // DESIGNATIONS
  // ==========================================

  async listDesignations(tenantId: string): Promise<DesignationDto[]> {
    const desigs = await this.prisma.tenantClient.designation.findMany({
      where: { tenantId },
      include: {
        department: { select: { name: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return desigs.map((d: any) => ({
      id: d.id,
      tenantId: d.tenantId,
      departmentId: d.departmentId,
      departmentName: d.department?.name || null,
      code: d.code,
      name: d.name,
      description: d.description,
      isActive: d.isActive,
      employeeCount: d._count?.employees || 0,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async createDesignation(tenantId: string, dto: CreateDesignationRequest): Promise<DesignationDto> {
    const existing = await this.prisma.tenantClient.designation.findFirst({
      where: { tenantId, code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Designation code "${dto.code}" already exists in this tenant`);
    }

    const desig = await this.prisma.tenantClient.designation.create({
      data: {
        tenantId,
        departmentId: dto.departmentId || null,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        isActive: true,
      },
      include: {
        department: { select: { name: true } },
      },
    });

    return {
      id: desig.id,
      tenantId: desig.tenantId,
      departmentId: desig.departmentId,
      departmentName: desig.department?.name || null,
      code: desig.code,
      name: desig.name,
      description: desig.description,
      isActive: desig.isActive,
      employeeCount: 0,
      createdAt: desig.createdAt.toISOString(),
    };
  }

  async updateDesignation(tenantId: string, id: string, dto: UpdateDesignationRequest): Promise<DesignationDto> {
    const existing = await this.prisma.tenantClient.designation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Designation ${id} not found`);
    }

    const data: any = {};
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase();
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId || null;
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.tenantClient.designation.update({
      where: { id },
      data,
      include: {
        department: { select: { name: true } },
        _count: { select: { employees: true } },
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      departmentId: updated.departmentId,
      departmentName: updated.department?.name || null,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      employeeCount: updated._count?.employees || 0,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteDesignation(tenantId: string, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.tenantClient.designation.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { employees: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Designation ${id} not found`);
    }

    if (existing._count?.employees > 0) {
      throw new BadRequestException(`Cannot delete designation with ${existing._count.employees} assigned employees`);
    }

    await this.prisma.tenantClient.designation.delete({ where: { id } });
    return { success: true };
  }

  // ==========================================
  // BRANCHES & UNITS
  // ==========================================

  async listBranches(tenantId: string): Promise<BranchDto[]> {
    const branches = await this.prisma.tenantClient.branch.findMany({
      where: { tenantId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return branches.map((b: any) => ({
      id: b.id,
      tenantId: b.tenantId,
      code: b.code,
      name: b.name,
      type: b.type,
      city: b.city,
      state: b.state,
      address: b.address,
      isActive: b.isActive,
      employeeCount: b._count?.employees || 0,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  async createBranch(tenantId: string, dto: CreateBranchRequest): Promise<BranchDto> {
    const existing = await this.prisma.tenantClient.branch.findFirst({
      where: { tenantId, code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Branch code "${dto.code}" already exists in this tenant`);
    }

    const branch = await this.prisma.tenantClient.branch.create({
      data: {
        tenantId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        type: dto.type || 'BRANCH_OFFICE',
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        address: dto.address?.trim() || null,
        isActive: true,
      },
    });

    return {
      id: branch.id,
      tenantId: branch.tenantId,
      code: branch.code,
      name: branch.name,
      type: branch.type,
      city: branch.city,
      state: branch.state,
      address: branch.address,
      isActive: branch.isActive,
      employeeCount: 0,
      createdAt: branch.createdAt.toISOString(),
    };
  }

  async updateBranch(tenantId: string, id: string, dto: UpdateBranchRequest): Promise<BranchDto> {
    const existing = await this.prisma.tenantClient.branch.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Branch ${id} not found`);
    }

    const data: any = {};
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase();
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.city !== undefined) data.city = dto.city.trim();
    if (dto.state !== undefined) data.state = dto.state.trim();
    if (dto.address !== undefined) data.address = dto.address.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.tenantClient.branch.update({
      where: { id },
      data,
      include: {
        _count: { select: { employees: true } },
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      code: updated.code,
      name: updated.name,
      type: updated.type,
      city: updated.city,
      state: updated.state,
      address: updated.address,
      isActive: updated.isActive,
      employeeCount: updated._count?.employees || 0,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteBranch(tenantId: string, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.tenantClient.branch.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { employees: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Branch ${id} not found`);
    }

    if (existing._count?.employees > 0) {
      throw new BadRequestException(`Cannot delete branch with ${existing._count.employees} assigned employees`);
    }

    await this.prisma.tenantClient.branch.delete({ where: { id } });
    return { success: true };
  }

  // ==========================================
  // SHIFTS
  // ==========================================

  async listShifts(tenantId: string): Promise<ShiftDto[]> {
    const shifts = await this.prisma.tenantClient.shift.findMany({
      where: { tenantId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    return shifts.map((s: any) => ({
      id: s.id,
      tenantId: s.tenantId,
      code: s.code,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      breakMinutes: s.breakMinutes,
      isActive: s.isActive,
      employeeCount: s._count?.employees || 0,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async createShift(tenantId: string, dto: CreateShiftRequest): Promise<ShiftDto> {
    const existing = await this.prisma.tenantClient.shift.findFirst({
      where: { tenantId, code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Shift code "${dto.code}" already exists in this tenant`);
    }

    const shift = await this.prisma.tenantClient.shift.create({
      data: {
        tenantId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        startTime: dto.startTime.trim(),
        endTime: dto.endTime.trim(),
        breakMinutes: dto.breakMinutes || 60,
        isActive: true,
      },
    });

    return {
      id: shift.id,
      tenantId: shift.tenantId,
      code: shift.code,
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMinutes: shift.breakMinutes,
      isActive: shift.isActive,
      employeeCount: 0,
      createdAt: shift.createdAt.toISOString(),
    };
  }

  async updateShift(tenantId: string, id: string, dto: UpdateShiftRequest): Promise<ShiftDto> {
    const existing = await this.prisma.tenantClient.shift.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Shift ${id} not found`);
    }

    const data: any = {};
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase();
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.startTime !== undefined) data.startTime = dto.startTime.trim();
    if (dto.endTime !== undefined) data.endTime = dto.endTime.trim();
    if (dto.breakMinutes !== undefined) data.breakMinutes = dto.breakMinutes;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.tenantClient.shift.update({
      where: { id },
      data,
      include: {
        _count: { select: { employees: true } },
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      code: updated.code,
      name: updated.name,
      startTime: updated.startTime,
      endTime: updated.endTime,
      breakMinutes: updated.breakMinutes,
      isActive: updated.isActive,
      employeeCount: updated._count?.employees || 0,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteShift(tenantId: string, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.tenantClient.shift.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Shift ${id} not found`);
    }

    await this.prisma.tenantClient.shift.delete({ where: { id } });
    return { success: true };
  }

  // ==========================================
  // EMPLOYMENT TYPES
  // ==========================================

  async listEmploymentTypes(tenantId: string): Promise<EmploymentTypeDto[]> {
    const types = await this.prisma.tenantClient.employmentType.findMany({
      where: { tenantId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return types.map((t: any) => ({
      id: t.id,
      tenantId: t.tenantId,
      code: t.code,
      name: t.name,
      description: t.description,
      isActive: t.isActive,
      employeeCount: t._count?.employees || 0,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async createEmploymentType(tenantId: string, dto: CreateEmploymentTypeRequest): Promise<EmploymentTypeDto> {
    const existing = await this.prisma.tenantClient.employmentType.findFirst({
      where: { tenantId, code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Employment Type code "${dto.code}" already exists in this tenant`);
    }

    const type = await this.prisma.tenantClient.employmentType.create({
      data: {
        tenantId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        isActive: true,
      },
    });

    return {
      id: type.id,
      tenantId: type.tenantId,
      code: type.code,
      name: type.name,
      description: type.description,
      isActive: type.isActive,
      employeeCount: 0,
      createdAt: type.createdAt.toISOString(),
    };
  }

  async updateEmploymentType(tenantId: string, id: string, dto: UpdateEmploymentTypeRequest): Promise<EmploymentTypeDto> {
    const existing = await this.prisma.tenantClient.employmentType.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Employment Type ${id} not found`);
    }

    const data: any = {};
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase();
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.tenantClient.employmentType.update({
      where: { id },
      data,
      include: {
        _count: { select: { employees: true } },
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      employeeCount: updated._count?.employees || 0,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteEmploymentType(tenantId: string, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.tenantClient.employmentType.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Employment Type ${id} not found`);
    }

    await this.prisma.tenantClient.employmentType.delete({ where: { id } });
    return { success: true };
  }

  // ==========================================
  // DEFAULT MASTER SEEDER
  // ==========================================

  private async seedTenantDefaults(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const isGarments = tenant?.industry === 'GARMENTS';

    // 1. Departments
    const deptData = isGarments
      ? [
          { code: 'DEPT-CUT', name: 'Cutting & Pattern Making', description: 'Fabric cutting and pattern master division' },
          { code: 'DEPT-SEW', name: 'Sewing & Stitching', description: 'Assembly line sewing and garment tailoring' },
          { code: 'DEPT-QC', name: 'Quality Control & Inspection', description: 'Fabric and finished garment defect inspection' },
          { code: 'DEPT-FIN', name: 'Finishing & Packaging', description: 'Steam ironing, tag attaching, and carton packaging' },
          { code: 'DEPT-HR', name: 'Human Resources & Admin', description: 'Workforce management, attendance, and payroll' },
          { code: 'DEPT-ACC', name: 'Finance & Accounts', description: 'Company accounts, billing, and tax statutory compliance' },
        ]
      : [
          { code: 'DEPT-ENG', name: 'Engineering & Technology', description: 'Software engineering, architecture, and systems' },
          { code: 'DEPT-OPS', name: 'Operations & Logistics', description: 'Day-to-day operational execution and logistics' },
          { code: 'DEPT-HR', name: 'Human Resources', description: 'Talent management and organizational culture' },
          { code: 'DEPT-FIN', name: 'Finance & Accounts', description: 'Accounting, budgeting, and fiscal management' },
          { code: 'DEPT-SALES', name: 'Sales & Business Development', description: 'Client acquisition and revenue growth' },
        ];

    const createdDepts = [];
    for (const d of deptData) {
      const created = await this.prisma.tenantClient.department.create({
        data: { tenantId, ...d, isActive: true },
      });
      createdDepts.push(created);
    }

    const cutDept = createdDepts.find(d => d.code === 'DEPT-CUT') || createdDepts[0];
    const sewDept = createdDepts.find(d => d.code === 'DEPT-SEW') || createdDepts[0];
    const qcDept = createdDepts.find(d => d.code === 'DEPT-QC') || createdDepts[0];
    const hrDept = createdDepts.find(d => d.code === 'DEPT-HR') || createdDepts[0];

    // 2. Designations
    const desigData = isGarments
      ? [
          { code: 'DESIG-CM', name: 'Cutting Master', departmentId: cutDept.id, description: 'Master fabric layout cutter' },
          { code: 'DESIG-PAT', name: 'Pattern Specialist', departmentId: cutDept.id, description: 'CAD and manual pattern grading' },
          { code: 'DESIG-STITCH', name: 'Senior Tailor / Stitcher', departmentId: sewDept.id, description: 'Single needle and overlock operator' },
          { code: 'DESIG-QC', name: 'Fabric Quality Inspector', departmentId: qcDept.id, description: 'Stitch and fabric quality checker' },
          { code: 'DESIG-HRM', name: 'HR & Payroll Manager', departmentId: hrDept.id, description: 'Human resources supervisor' },
        ]
      : [
          { code: 'DESIG-SE', name: 'Software Engineer', departmentId: createdDepts[0].id, description: 'Full stack engineer' },
          { code: 'DESIG-LEAD', name: 'Team Lead', departmentId: createdDepts[0].id, description: 'Technical team lead' },
          { code: 'DESIG-MGR', name: 'Operations Manager', departmentId: createdDepts[1]?.id || createdDepts[0].id, description: 'Process operations manager' },
          { code: 'DESIG-HRM', name: 'HR Specialist', departmentId: hrDept.id, description: 'Human resources specialist' },
        ];

    for (const d of desigData) {
      await this.prisma.tenantClient.designation.create({
        data: { tenantId, ...d, isActive: true },
      });
    }

    // 3. Branches / Factory Units
    const branchData = isGarments
      ? [
          { code: 'BR-CHN-HQ', name: 'Chennai Head Office', type: 'HEAD_OFFICE', city: 'Chennai', state: 'Tamil Nadu', address: 'Guindy Industrial Estate' },
          { code: 'BR-TPR-UNIT1', name: 'Tirupur Garment Unit 1', type: 'FACTORY_UNIT', city: 'Tirupur', state: 'Tamil Nadu', address: 'Avinashi Road Textile Hub' },
          { code: 'BR-CBE-UNIT2', name: 'Coimbatore Knitting Unit', type: 'FACTORY_UNIT', city: 'Coimbatore', state: 'Tamil Nadu', address: 'SIDCO Industrial Estate' },
        ]
      : [
          { code: 'BR-HQ', name: 'Corporate Head Office', type: 'HEAD_OFFICE', city: 'Chennai', state: 'Tamil Nadu', address: 'OMR IT Corridor' },
          { code: 'BR-REG', name: 'Regional Office', type: 'BRANCH_OFFICE', city: 'Bangalore', state: 'Karnataka', address: 'Electronic City' },
        ];

    for (const b of branchData) {
      await this.prisma.tenantClient.branch.create({
        data: { tenantId, ...b, isActive: true },
      });
    }

    // 4. Shifts
    const shiftData = [
      { code: 'SH-GEN', name: 'General Shift', startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
      { code: 'SH-MORN', name: 'Morning Shift (Factory)', startTime: '06:00', endTime: '14:00', breakMinutes: 30 },
      { code: 'SH-EVE', name: 'Evening Shift (Factory)', startTime: '14:00', endTime: '22:00', breakMinutes: 30 },
      { code: 'SH-NGT', name: 'Night Shift', startTime: '22:00', endTime: '06:00', breakMinutes: 30 },
    ];

    for (const s of shiftData) {
      await this.prisma.tenantClient.shift.create({
        data: { tenantId, ...s, isActive: true },
      });
    }

    // 5. Employment Types
    const empTypeData = [
      { code: 'ET-PERM', name: 'Permanent Full-Time', description: 'Standard regular on-roll employee' },
      { code: 'ET-CONT', name: 'Contract / Piece-Rate Worker', description: 'Daily wage or piece-rate garment producer' },
      { code: 'ET-PROB', name: 'Probationer', description: 'Initial 3 to 6 months probation' },
      { code: 'ET-TRAIN', name: 'Apprentice / Trainee', description: 'Under technical apprenticeship' },
    ];

    for (const et of empTypeData) {
      await this.prisma.tenantClient.employmentType.create({
        data: { tenantId, ...et, isActive: true },
      });
    }
  }
}
