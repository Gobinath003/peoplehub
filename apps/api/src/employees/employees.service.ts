import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeDto } from '@people-hub/shared-types';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, branchScope?: string | null): Promise<EmployeeDto[]> {
    const whereClause: any = { tenantId };
    if (branchScope) {
      whereClause.branch = branchScope;
    }

    const employees = await this.prisma.tenantClient.employee.findMany({
      where: whereClause,
      include: {
        salaryStructure: true
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
    // 1. Check if employee code already exists in tenant
    const existing = await this.prisma.tenantClient.employee.findFirst({
      where: {
        tenantId,
        employeeCode: dto.employeeCode
      }
    });

    if (existing) {
      throw new ConflictException(`Employee code "${dto.employeeCode}" already exists in this company`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 2. Resolve master names if IDs provided
      let deptName = dto.department?.trim() || '';
      if (dto.departmentId) {
        const dept = await tx.department.findUnique({ where: { id: dto.departmentId } });
        if (dept) deptName = dept.name;
      }
      let desigName = dto.designation?.trim() || '';
      if (dto.designationId) {
        const desig = await tx.designation.findUnique({ where: { id: dto.designationId } });
        if (desig) desigName = desig.name;
      }
      let branchName = dto.branch?.trim() || null;
      if (dto.branchId) {
        const br = await tx.branch.findUnique({ where: { id: dto.branchId } });
        if (br) branchName = br.name;
      }

      // Create Employee
      const employee = await tx.employee.create({
        data: {
          tenantId,
          employeeCode: dto.employeeCode.trim(),
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone || null,
          department: deptName,
          designation: desigName,
          branch: branchName,
          departmentId: dto.departmentId || null,
          designationId: dto.designationId || null,
          branchId: dto.branchId || null,
          shiftId: dto.shiftId || null,
          employmentTypeId: dto.employmentTypeId || null,
          salaryType: dto.salaryType || 'MONTHLY_FIXED',
          joiningDate: new Date(dto.joiningDate),
          status: dto.status || 'ACTIVE',
        }
      });

      // 3. Create SalaryStructure if basicSalary is provided
      let salaryStructure = null;
      if (dto.basicSalary && dto.basicSalary > 0) {
        const basic = Number(dto.basicSalary);
        const hra = Number(dto.hra || 0);
        const special = Number(dto.specialAllowance || 0);
        const conveyance = Number(dto.conveyanceAllowance || 0);
        const pf = Number(dto.pfDeduction || 0);
        const tax = Number(dto.taxDeduction || 0);

        const gross = basic + hra + special + conveyance;
        const net = gross - (pf + tax);

        salaryStructure = await tx.salaryStructure.create({
          data: {
            tenantId,
            employeeId: employee.id,
            basicSalary: basic,
            hra,
            specialAllowance: special,
            conveyanceAllowance: conveyance,
            pfDeduction: pf,
            taxDeduction: tax,
            otherDeductions: 0,
            grossSalary: gross,
            netSalary: net,
            currency: 'INR',
          }
        });
      }

      return this.mapToDto({ ...employee, salaryStructure });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeRequest): Promise<EmployeeDto> {
    const existing = await this.prisma.tenantClient.employee.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const data: any = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.designation !== undefined) data.designation = dto.designation;
    if (dto.branch !== undefined) data.branch = dto.branch;
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
    if (dto.designationId !== undefined) data.designationId = dto.designationId;
    if (dto.branchId !== undefined) data.branchId = dto.branchId;
    if (dto.shiftId !== undefined) data.shiftId = dto.shiftId;
    if (dto.employmentTypeId !== undefined) data.employmentTypeId = dto.employmentTypeId;
    if (dto.salaryType !== undefined) data.salaryType = dto.salaryType;
    if (dto.joiningDate !== undefined) data.joiningDate = new Date(dto.joiningDate);
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.tenantClient.employee.update({
      where: { id },
      data,
      include: {
        salaryStructure: true
      }
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
}
