import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  UpsertSalaryStructureRequest, 
  SalaryStructureDto, 
  GeneratePayslipRequest, 
  PayslipDto 
} from '@people-hub/shared-types';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async listStructures(tenantId: string, branchScope?: string | null): Promise<any[]> {
    const whereEmployee: any = { tenantId };
    if (branchScope) {
      whereEmployee.branch = branchScope;
    }

    const employees = await this.prisma.tenantClient.employee.findMany({
      where: whereEmployee,
      include: {
        salaryStructure: true
      },
      orderBy: { employeeCode: 'asc' }
    });

    return employees.map((emp: any) => ({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      designation: emp.designation,
      branch: emp.branch,
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
        effectiveDate: emp.salaryStructure.effectiveDate.toISOString(),
      } : null
    }));
  }

  async upsertStructure(
    tenantId: string,
    employeeId: string,
    dto: UpsertSalaryStructureRequest
  ): Promise<SalaryStructureDto> {
    const employee = await this.prisma.tenantClient.employee.findFirst({
      where: { id: employeeId, tenantId }
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    const basic = Number(dto.basicSalary || 0);
    const hra = Number(dto.hra || 0);
    const special = Number(dto.specialAllowance || 0);
    const conveyance = Number(dto.conveyanceAllowance || 0);
    const pf = Number(dto.pfDeduction || 0);
    const tax = Number(dto.taxDeduction || 0);
    const other = Number(dto.otherDeductions || 0);

    const gross = basic + hra + special + conveyance;
    const net = gross - (pf + tax + other);

    const structure = await this.prisma.tenantClient.salaryStructure.upsert({
      where: { employeeId },
      create: {
        tenantId,
        employeeId,
        basicSalary: basic,
        hra,
        specialAllowance: special,
        conveyanceAllowance: conveyance,
        pfDeduction: pf,
        taxDeduction: tax,
        otherDeductions: other,
        grossSalary: gross,
        netSalary: net,
        currency: 'INR',
      },
      update: {
        basicSalary: basic,
        hra,
        specialAllowance: special,
        conveyanceAllowance: conveyance,
        pfDeduction: pf,
        taxDeduction: tax,
        otherDeductions: other,
        grossSalary: gross,
        netSalary: net,
      }
    });

    return {
      id: structure.id,
      employeeId: structure.employeeId,
      basicSalary: structure.basicSalary,
      hra: structure.hra,
      specialAllowance: structure.specialAllowance,
      conveyanceAllowance: structure.conveyanceAllowance,
      pfDeduction: structure.pfDeduction,
      taxDeduction: structure.taxDeduction,
      otherDeductions: structure.otherDeductions,
      grossSalary: structure.grossSalary,
      netSalary: structure.netSalary,
      currency: structure.currency,
      effectiveDate: structure.effectiveDate.toISOString(),
    };
  }

  async listPayslips(
    tenantId: string,
    query?: { employeeId?: string; month?: number; year?: number }
  ): Promise<PayslipDto[]> {
    const where: any = { tenantId };
    if (query?.employeeId) where.employeeId = query.employeeId;
    if (query?.month) where.month = Number(query.month);
    if (query?.year) where.year = Number(query.year);

    const payslips = await this.prisma.tenantClient.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
            branch: true,
          }
        },
        tenant: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return payslips.map((p: any) => this.mapPayslipToDto(p));
  }

  async getPayslipById(tenantId: string, id: string): Promise<PayslipDto> {
    const p = await this.prisma.tenantClient.payslip.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
            branch: true,
          }
        },
        tenant: {
          select: {
            name: true
          }
        }
      }
    });

    if (!p) {
      throw new NotFoundException(`Payslip with ID ${id} not found`);
    }

    return this.mapPayslipToDto(p);
  }

  async generatePayslips(
    tenantId: string,
    dto: GeneratePayslipRequest
  ): Promise<{ generatedCount: number; payslips: PayslipDto[] }> {
    const month = Number(dto.month);
    const year = Number(dto.year);
    const payPeriod = dto.payPeriod || `${this.getMonthName(month)} ${year}`;
    const workingDays = dto.workingDays || 30;

    // Find target employees
    const whereEmployee: any = {
      tenantId,
      status: 'ACTIVE'
    };
    if (dto.employeeId) {
      whereEmployee.id = dto.employeeId;
    }

    const employees = await this.prisma.tenantClient.employee.findMany({
      where: whereEmployee,
      include: {
        salaryStructure: true
      }
    });

    if (employees.length === 0) {
      throw new BadRequestException('No eligible active employees found with salary configuration');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const generated: any[] = [];

    await this.prisma.$transaction(async (tx: any) => {
      for (const emp of employees) {
        let basic = 0;
        let hra = 0;
        let allowances = 0;
        let pf = 0;
        let tax = 0;
        let other = 0;
        let pieceRateUnits: number | null = null;
        let pieceRateDetails: any = null;
        const salaryType = emp.salaryType || 'MONTHLY_FIXED';

        if (salaryType === 'PIECE_RATE') {
          // 1. Fetch piece-rate activity logs for this month
          const logs = await tx.pieceRateLog.findMany({
            where: {
              tenantId,
              employeeId: emp.id,
              logDate: { gte: startDate, lte: endDate }
            },
            include: { activity: true }
          });

          // Aggregate piece-rate output
          let totalPieceAmount = 0;
          let totalPieces = 0;
          const actMap = new Map<string, any>();

          for (const l of logs) {
            totalPieces += l.quantity;
            totalPieceAmount += l.totalAmount;
            const actName = l.activity?.name || 'Production Operation';
            if (!actMap.has(actName)) {
              actMap.set(actName, {
                activityName: actName,
                units: 0,
                rate: l.unitRate,
                total: 0
              });
            }
            const actItem = actMap.get(actName)!;
            actItem.units += l.quantity;
            actItem.total += l.totalAmount;
          }

          basic = totalPieceAmount;
          pieceRateUnits = totalPieces;
          pieceRateDetails = Array.from(actMap.values());

          if (emp.salaryStructure) {
            hra = emp.salaryStructure.hra;
            allowances = emp.salaryStructure.specialAllowance + emp.salaryStructure.conveyanceAllowance;
            pf = emp.salaryStructure.pfDeduction;
            tax = emp.salaryStructure.taxDeduction;
            other = emp.salaryStructure.otherDeductions;
          }
        } else {
          // Standard Monthly Fixed Salary
          if (!emp.salaryStructure) {
            continue; // Skip employees without configured salary
          }

          basic = emp.salaryStructure.basicSalary;
          hra = emp.salaryStructure.hra;
          allowances = emp.salaryStructure.specialAllowance + emp.salaryStructure.conveyanceAllowance;
          pf = emp.salaryStructure.pfDeduction;
          tax = emp.salaryStructure.taxDeduction;
          other = emp.salaryStructure.otherDeductions;
        }

        const grossEarnings = basic + hra + allowances;
        const totalDeductions = pf + tax + other;
        const netPayable = grossEarnings - totalDeductions;

        const remarks = salaryType === 'PIECE_RATE'
          ? `Piece-rate payroll: ${pieceRateUnits || 0} units completed across ${pieceRateDetails?.length || 0} operations`
          : `Fixed monthly payroll for ${payPeriod}`;

        const record = await tx.payslip.upsert({
          where: {
            tenantId_employeeId_month_year: {
              tenantId,
              employeeId: emp.id,
              month,
              year
            }
          },
          create: {
            tenantId,
            employeeId: emp.id,
            payPeriod,
            salaryType,
            month,
            year,
            workingDays,
            presentDays: workingDays,
            paidDays: workingDays,
            pieceRateUnits,
            pieceRateDetails: pieceRateDetails || undefined,
            basicSalary: basic,
            hra,
            allowances,
            grossEarnings,
            pfDeduction: pf,
            taxDeduction: tax,
            otherDeductions: other,
            totalDeductions,
            netPayable,
            status: 'GENERATED',
            paymentDate: new Date(),
            remarks
          },
          update: {
            payPeriod,
            salaryType,
            workingDays,
            presentDays: workingDays,
            paidDays: workingDays,
            pieceRateUnits,
            pieceRateDetails: pieceRateDetails || undefined,
            basicSalary: basic,
            hra,
            allowances,
            grossEarnings,
            pfDeduction: pf,
            taxDeduction: tax,
            otherDeductions: other,
            totalDeductions,
            netPayable,
            status: 'GENERATED',
            paymentDate: new Date(),
            remarks
          },
          include: {
            employee: true,
            tenant: true
          }
        });

        generated.push(record);
      }
    });

    return {
      generatedCount: generated.length,
      payslips: generated.map((p: any) => this.mapPayslipToDto(p))
    };
  }

  private mapPayslipToDto(p: any): PayslipDto {
    return {
      id: p.id,
      tenantId: p.tenantId,
      employeeId: p.employeeId,
      employeeCode: p.employee?.employeeCode,
      employeeName: p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : 'Employee',
      department: p.employee?.department,
      designation: p.employee?.designation,
      branch: p.employee?.branch,
      companyName: p.tenant?.name,
      payPeriod: p.payPeriod,
      salaryType: p.salaryType || 'MONTHLY_FIXED',
      month: p.month,
      year: p.year,
      workingDays: p.workingDays,
      presentDays: p.presentDays,
      paidDays: p.paidDays,
      pieceRateUnits: p.pieceRateUnits,
      pieceRateDetails: p.pieceRateDetails,
      basicSalary: p.basicSalary,
      hra: p.hra,
      allowances: p.allowances,
      grossEarnings: p.grossEarnings,
      pfDeduction: p.pfDeduction,
      taxDeduction: p.taxDeduction,
      otherDeductions: p.otherDeductions,
      totalDeductions: p.totalDeductions,
      netPayable: p.netPayable,
      status: p.status,
      paymentDate: p.paymentDate instanceof Date ? p.paymentDate.toISOString() : p.paymentDate,
      remarks: p.remarks,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    };
  }

  private getMonthName(month: number): string {
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return names[month - 1] || 'Month';
  }
}
