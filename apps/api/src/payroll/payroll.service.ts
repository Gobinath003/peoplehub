import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  UpsertSalaryStructureRequest, 
  SalaryStructureDto, 
  GeneratePayslipRequest, 
  CreateHourlyWorkLogRequest,
  HourlyWorkLogDto,
  SalaryType,
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
      salaryType: emp.salaryType || 'MONTHLY_FIXED',
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
    const hourlyRate = Number(dto.hourlyRate || 0);
    const dailyRate = Number(dto.dailyRate || 0);
    const standardHours = Number(dto.standardHours ?? (employee.salaryType === SalaryType.DAILY_WAGE ? 26 : 160));
    const overtimeMultiplier = Number(dto.overtimeMultiplier || 1.5);
    const pf = Number(dto.pfDeduction || 0);
    const tax = Number(dto.taxDeduction || 0);
    const other = Number(dto.otherDeductions || 0);

    let gross = basic + hra + special + conveyance;
    if (employee.salaryType === SalaryType.HOURLY && hourlyRate > 0) {
      gross = Math.round(hourlyRate * standardHours) + hra + special + conveyance;
    } else if (employee.salaryType === SalaryType.DAILY_WAGE && dailyRate > 0) {
      gross = Math.round(dailyRate * standardHours) + hra + special + conveyance;
    }
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
        hourlyRate,
        dailyRate,
        standardHours,
        overtimeMultiplier,
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
        hourlyRate,
        dailyRate,
        standardHours,
        overtimeMultiplier,
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
      hourlyRate: structure.hourlyRate,
      dailyRate: structure.dailyRate,
      standardHours: structure.standardHours,
      overtimeMultiplier: structure.overtimeMultiplier,
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
    const isWeekly = dto.cycleType === 'WEEKLY';
    const year = Number(dto.year);
    const weekNumber = Number(dto.weekNumber || 1);
    const month = isWeekly ? (100 + weekNumber) : Number(dto.month);
    const workingDays = dto.workingDays || (isWeekly ? 6 : 30);
    const payPeriod = dto.payPeriod || (isWeekly ? `Week ${weekNumber}, ${year}` : `${this.getMonthName(month)} ${year}`);

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

    let startDate: Date;
    let endDate: Date;
    if (dto.startDate && dto.endDate) {
      startDate = new Date(dto.startDate);
      endDate = new Date(dto.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (isWeekly) {
      const daysOffset = (weekNumber - 1) * 7;
      startDate = new Date(year, 0, 1 + daysOffset);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    }

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
        let hoursWorked: number | null = null;
        let hourlyRate: number | null = null;
        let dailyRate: number | null = null;
        let hourlyDetails: any = null;
        let empPaidDays = workingDays;
        const salaryType = emp.salaryType || 'MONTHLY_FIXED';

        if (salaryType === 'PIECE_RATE') {
          // 1. Fetch piece-rate activity logs for this period
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
            const ratio = isWeekly ? (workingDays / 30) : 1;
            hra = Math.round(emp.salaryStructure.hra * ratio);
            allowances = Math.round((emp.salaryStructure.specialAllowance + emp.salaryStructure.conveyanceAllowance) * ratio);
            pf = Math.round(emp.salaryStructure.pfDeduction * ratio);
            tax = Math.round(emp.salaryStructure.taxDeduction * ratio);
            other = Math.round(emp.salaryStructure.otherDeductions * ratio);
          }
        } else if (salaryType === SalaryType.HOURLY) {
          const logs = await tx.hourlyWorkLog.findMany({
            where: {
              tenantId,
              employeeId: emp.id,
              logDate: { gte: startDate, lte: endDate }
            },
            orderBy: { logDate: 'asc' }
          });

          const configuredRate = emp.salaryStructure?.hourlyRate || 0;
          const configuredHours = emp.salaryStructure?.standardHours ?? 0;

          if (logs.length > 0) {
            let totalHrs = 0;
            let totalAmt = 0;
            const details: any[] = [];
            for (const l of logs) {
              const logTotalHrs = Number(l.regularHours || 0) + Number(l.overtimeHours || 0);
              totalHrs += logTotalHrs;
              totalAmt += Number(l.totalAmount || 0);
              details.push({
                logDate: l.logDate instanceof Date ? l.logDate.toISOString().split('T')[0] : String(l.logDate).split('T')[0],
                projectOrTask: l.projectOrTask || 'Standard Shift / Time Billing',
                regularHours: l.regularHours,
                overtimeHours: l.overtimeHours,
                hourlyRate: l.hourlyRate,
                total: Math.round(l.totalAmount)
              });
            }
            basic = Math.round(totalAmt);
            hoursWorked = Math.round(totalHrs * 100) / 100;
            hourlyRate = configuredRate > 0 ? configuredRate : (totalHrs > 0 ? Math.round((totalAmt / totalHrs) * 100) / 100 : 0);
            hourlyDetails = details;
          } else if (configuredRate > 0 && configuredHours > 0) {
            const baselineHrs = isWeekly ? Math.round((configuredHours / 4) * 10) / 10 : configuredHours;
            hoursWorked = baselineHrs;
            hourlyRate = configuredRate;
            basic = Math.round(baselineHrs * configuredRate);
            hourlyDetails = [{
              logDate: startDate.toISOString().split('T')[0],
              projectOrTask: `Contracted Default Baseline (${baselineHrs} hrs)`,
              regularHours: baselineHrs,
              overtimeHours: 0,
              hourlyRate: configuredRate,
              total: basic
            }];
          } else {
            continue;
          }

          if (emp.salaryStructure) {
            const ratio = isWeekly ? (workingDays / 30) : 1;
            hra = Math.round(emp.salaryStructure.hra * ratio);
            allowances = Math.round((emp.salaryStructure.specialAllowance + emp.salaryStructure.conveyanceAllowance) * ratio);
            pf = Math.round(emp.salaryStructure.pfDeduction * ratio);
            tax = Math.round(emp.salaryStructure.taxDeduction * ratio);
            other = Math.round(emp.salaryStructure.otherDeductions * ratio);
          }
        } else if (salaryType === SalaryType.DAILY_WAGE) {
          if (!emp.salaryStructure || !(emp.salaryStructure.dailyRate > 0)) {
            continue;
          }
          dailyRate = emp.salaryStructure.dailyRate;
          empPaidDays = (!isWeekly && !dto.workingDays && emp.salaryStructure.standardHours > 0)
            ? emp.salaryStructure.standardHours
            : workingDays;
          basic = Math.round(dailyRate * empPaidDays);
          const ratio = isWeekly ? (workingDays / 30) : 1;
          hra = Math.round(emp.salaryStructure.hra * ratio);
          allowances = Math.round((emp.salaryStructure.specialAllowance + emp.salaryStructure.conveyanceAllowance) * ratio);
          pf = Math.round(emp.salaryStructure.pfDeduction * ratio);
          tax = Math.round(emp.salaryStructure.taxDeduction * ratio);
          other = Math.round(emp.salaryStructure.otherDeductions * ratio);
        } else {
          // Standard Monthly Fixed Salary
          if (!emp.salaryStructure) {
            continue; // Skip employees without configured salary
          }

          const ratio = isWeekly ? (workingDays / 30) : 1;
          basic = Math.round(emp.salaryStructure.basicSalary * ratio);
          hra = Math.round(emp.salaryStructure.hra * ratio);
          allowances = Math.round((emp.salaryStructure.specialAllowance + emp.salaryStructure.conveyanceAllowance) * ratio);
          pf = Math.round(emp.salaryStructure.pfDeduction * ratio);
          tax = Math.round(emp.salaryStructure.taxDeduction * ratio);
          other = Math.round(emp.salaryStructure.otherDeductions * ratio);
        }

        const grossEarnings = basic + hra + allowances;
        const totalDeductions = pf + tax + other;
        const netPayable = grossEarnings - totalDeductions;

        const remarks = salaryType === 'PIECE_RATE'
          ? `${isWeekly ? 'Weekly' : 'Monthly'} piece-rate payroll: ${pieceRateUnits || 0} units completed across ${pieceRateDetails?.length || 0} operations`
          : salaryType === SalaryType.HOURLY
          ? `${isWeekly ? 'Weekly' : 'Monthly'} hourly payroll: ${hoursWorked || 0} hrs @ ₹${hourlyRate || 0}/hr`
          : salaryType === SalaryType.DAILY_WAGE
          ? `${isWeekly ? 'Weekly' : 'Monthly'} daily-wage payroll: ${empPaidDays} days @ ₹${dailyRate || 0}/day`
          : `${isWeekly ? 'Weekly' : 'Monthly'} fixed payroll for ${payPeriod}`;

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
            workingDays: empPaidDays,
            presentDays: empPaidDays,
            paidDays: empPaidDays,
            pieceRateUnits,
            pieceRateDetails: pieceRateDetails || undefined,
            hoursWorked,
            hourlyRate,
            dailyRate,
            hourlyDetails: hourlyDetails || undefined,
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
            workingDays: empPaidDays,
            presentDays: empPaidDays,
            paidDays: empPaidDays,
            pieceRateUnits,
            pieceRateDetails: pieceRateDetails || undefined,
            hoursWorked,
            hourlyRate,
            dailyRate,
            hourlyDetails: hourlyDetails || undefined,
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
      hoursWorked: p.hoursWorked,
      hourlyRate: p.hourlyRate,
      dailyRate: p.dailyRate,
      hourlyDetails: p.hourlyDetails,
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

  async listHourlyLogs(
    tenantId: string,
    query?: { employeeId?: string; startDate?: string; endDate?: string }
  ): Promise<HourlyWorkLogDto[]> {
    const where: any = { tenantId };
    if (query?.employeeId) where.employeeId = query.employeeId;
    if (query?.startDate || query?.endDate) {
      where.logDate = {};
      if (query.startDate) where.logDate.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.logDate.lte = end;
      }
    }

    const logs = await this.prisma.tenantClient.hourlyWorkLog.findMany({
      where,
      include: {
        employee: {
          select: { employeeCode: true, firstName: true, lastName: true, department: true }
        }
      },
      orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }]
    });

    return logs.map((l: any) => this.mapHourlyLogToDto(l));
  }

  async createHourlyLog(
    tenantId: string,
    recordedBy: string | undefined,
    dto: CreateHourlyWorkLogRequest
  ): Promise<HourlyWorkLogDto> {
    const emp = await this.prisma.tenantClient.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
      include: { salaryStructure: true }
    });
    if (!emp) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    }

    const regularHours = Number(dto.regularHours || 0);
    const overtimeHours = Number(dto.overtimeHours || 0);
    if (regularHours < 0 || overtimeHours < 0 || regularHours + overtimeHours <= 0) {
      throw new BadRequestException('Logged regular + overtime hours must be greater than zero');
    }

    const hourlyRate = Number(dto.hourlyRate ?? emp.salaryStructure?.hourlyRate ?? 0);
    if (hourlyRate <= 0) {
      throw new BadRequestException('Hourly rate must be greater than zero (configure it on employee salary structure or provide hourlyRate)');
    }

    const overtimeMultiplier = Number(dto.overtimeMultiplier ?? emp.salaryStructure?.overtimeMultiplier ?? 1.5);
    const totalAmount = Math.round(((regularHours * hourlyRate) + (overtimeHours * hourlyRate * overtimeMultiplier)) * 100) / 100;

    const created = await this.prisma.tenantClient.hourlyWorkLog.create({
      data: {
        tenantId,
        employeeId: emp.id,
        logDate: new Date(dto.logDate),
        regularHours,
        overtimeHours,
        hourlyRate,
        overtimeMultiplier,
        totalAmount,
        projectOrTask: dto.projectOrTask?.trim() || null,
        remarks: dto.remarks?.trim() || null,
        recordedBy: recordedBy || null,
      },
      include: {
        employee: {
          select: { employeeCode: true, firstName: true, lastName: true, department: true }
        }
      }
    });

    return this.mapHourlyLogToDto(created);
  }

  async deleteHourlyLog(tenantId: string, id: string) {
    const existing = await this.prisma.tenantClient.hourlyWorkLog.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      throw new NotFoundException(`Hourly work log ${id} not found`);
    }
    return this.prisma.tenantClient.hourlyWorkLog.delete({ where: { id } });
  }

  private mapHourlyLogToDto(l: any): HourlyWorkLogDto {
    return {
      id: l.id,
      tenantId: l.tenantId,
      employeeId: l.employeeId,
      employeeCode: l.employee?.employeeCode,
      employeeName: l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : undefined,
      department: l.employee?.department,
      logDate: l.logDate instanceof Date ? l.logDate.toISOString() : l.logDate,
      regularHours: l.regularHours,
      overtimeHours: l.overtimeHours,
      hourlyRate: l.hourlyRate,
      overtimeMultiplier: l.overtimeMultiplier,
      totalAmount: l.totalAmount,
      projectOrTask: l.projectOrTask,
      remarks: l.remarks,
      recordedBy: l.recordedBy,
      createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
    };
  }
}
