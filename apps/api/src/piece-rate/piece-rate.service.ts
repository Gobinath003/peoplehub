import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  PieceRateActivityDto, 
  CreatePieceRateActivityRequest, 
  PieceRateLogDto, 
  CreatePieceRateLogRequest, 
  PieceRateEmployeeSummaryDto,
  PieceRateDetailItem 
} from '@people-hub/shared-types';

@Injectable()
export class PieceRateService {
  constructor(private prisma: PrismaService) {}

  private async resolveTenantId(tenantId: string): Promise<string> {
    if (!tenantId || tenantId === '23ee8399-e03c-4521-9e50-0332e1e1a9e7' || tenantId === 't2222222-2222-2222-2222-222222222222') {
      const g = await this.prisma.tenant.findFirst({
        where: { OR: [{ industry: 'GARMENTS' }, { slug: 'abc-garments' }] }
      });
      if (g) return g.id;
    }
    if (tenantId === 't3333333-3333-3333-3333-333333333333') {
      const l = await this.prisma.tenant.findFirst({
        where: { OR: [{ industry: 'LOGISTICS' }, { slug: 'chennai-logistics' }] }
      });
      if (l) return l.id;
    }
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (t) return t.id;

    const bySlug = await this.prisma.tenant.findFirst({ where: { slug: tenantId } });
    if (bySlug) return bySlug.id;

    const fallback = await this.prisma.tenant.findFirst({ where: { industry: 'GARMENTS', status: 'ACTIVE' } })
      || await this.prisma.tenant.findFirst({ where: { status: 'ACTIVE' } });
    return fallback ? fallback.id : tenantId;
  }

  private isValidUuid(val?: string | null): boolean {
    return !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  }

  async listActivities(tenantId: string): Promise<PieceRateActivityDto[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    let activities = await this.prisma.pieceRateActivity.findMany({
      where: { tenantId: effectiveTenantId },
      orderBy: { createdAt: 'asc' }
    });

    // Auto-seed default garment operations if none exist
    if (activities.length === 0) {
      const defaults = [
        { code: 'CUTTING', name: 'Master Cutting', unit: 'piece', ratePerUnit: 15, description: 'Fabric pattern precision cutting' },
        { code: 'STITCHING', name: 'Garment Stitching', unit: 'piece', ratePerUnit: 25, description: 'Full body assembly and stitching' },
        { code: 'BUTTONING', name: 'Button Hole & Fixing', unit: 'piece', ratePerUnit: 5, description: 'Machine button hole & attachment' },
        { code: 'IRONING', name: 'Steam Pressing & Ironing', unit: 'piece', ratePerUnit: 8, description: 'Final garment steam press' },
        { code: 'PACKING', name: 'Inspection & Box Packing', unit: 'piece', ratePerUnit: 4, description: 'Final packaging for dispatch' },
      ];

      await this.prisma.pieceRateActivity.createMany({
        data: defaults.map(d => ({
          tenantId: effectiveTenantId,
          ...d
        }))
      });

      activities = await this.prisma.pieceRateActivity.findMany({
        where: { tenantId: effectiveTenantId },
        orderBy: { createdAt: 'asc' }
      });
    }

    return activities.map((a: any) => ({
      id: a.id,
      tenantId: a.tenantId,
      code: a.code,
      name: a.name,
      unit: a.unit,
      ratePerUnit: a.ratePerUnit,
      description: a.description,
      isActive: a.isActive,
      createdAt: a.createdAt.toISOString()
    }));
  }

  async createActivity(tenantId: string, dto: CreatePieceRateActivityRequest): Promise<PieceRateActivityDto> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.pieceRateActivity.findFirst({
      where: { tenantId: effectiveTenantId, code }
    });

    if (existing) {
      throw new ConflictException(`Activity code "${code}" already exists in this organization`);
    }

    const activity = await this.prisma.pieceRateActivity.create({
      data: {
        tenantId: effectiveTenantId,
        code,
        name: dto.name.trim(),
        unit: dto.unit?.trim().toLowerCase() || 'piece',
        ratePerUnit: Number(dto.ratePerUnit),
        description: dto.description || null,
        isActive: true
      }
    });

    return {
      id: activity.id,
      tenantId: activity.tenantId,
      code: activity.code,
      name: activity.name,
      unit: activity.unit,
      ratePerUnit: activity.ratePerUnit,
      description: activity.description,
      isActive: activity.isActive,
      createdAt: activity.createdAt.toISOString()
    };
  }

  async listLogs(
    tenantId: string,
    query?: { employeeId?: string; activityId?: string; startDate?: string; endDate?: string }
  ): Promise<PieceRateLogDto[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const where: any = { tenantId: effectiveTenantId };
    if (query?.employeeId) where.employeeId = query.employeeId;
    if (query?.activityId) where.activityId = query.activityId;

    if (query?.startDate || query?.endDate) {
      where.logDate = {};
      if (query.startDate) where.logDate.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.logDate.lte = end;
      }
    }

    const logs = await this.prisma.pieceRateLog.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true
          }
        },
        activity: {
          select: {
            code: true,
            name: true,
            unit: true
          }
        }
      },
      orderBy: { logDate: 'desc' }
    });

    return logs.map((l: any) => ({
      id: l.id,
      tenantId: l.tenantId,
      employeeId: l.employeeId,
      employeeCode: l.employee?.employeeCode,
      employeeName: `${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`.trim(),
      activityId: l.activityId,
      activityCode: l.activity?.code,
      activityName: l.activity?.name,
      unit: l.activity?.unit,
      logDate: l.logDate.toISOString(),
      quantity: l.quantity,
      unitRate: l.unitRate,
      totalAmount: l.totalAmount,
      remarks: l.remarks,
      recordedBy: l.recordedBy,
      createdAt: l.createdAt.toISOString()
    }));
  }

  async createLog(tenantId: string, dto: CreatePieceRateLogRequest, recordedBy?: string): Promise<PieceRateLogDto> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const safeRecordedBy = this.isValidUuid(recordedBy) ? recordedBy : null;

    let employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId: effectiveTenantId }
    }) || await this.prisma.employee.findFirst({
      where: { OR: [{ id: dto.employeeId }, { employeeCode: dto.employeeId }] }
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    }

    let activity = await this.prisma.pieceRateActivity.findFirst({
      where: { id: dto.activityId, tenantId: effectiveTenantId }
    }) || await this.prisma.pieceRateActivity.findFirst({
      where: { OR: [{ id: dto.activityId }, { code: dto.activityId }] }
    });

    if (!activity) {
      throw new NotFoundException(`Activity ${dto.activityId} not found`);
    }

    const unitRate = dto.unitRate !== undefined ? Number(dto.unitRate) : activity.ratePerUnit;
    const quantity = Number(dto.quantity);
    const totalAmount = quantity * unitRate;

    const log = await this.prisma.pieceRateLog.create({
      data: {
        tenantId: employee.tenantId || effectiveTenantId,
        employeeId: employee.id,
        activityId: activity.id,
        logDate: new Date(dto.logDate),
        quantity,
        unitRate,
        totalAmount,
        remarks: dto.remarks || null,
        recordedBy: safeRecordedBy
      },
      include: {
        employee: true,
        activity: true
      }
    });

    return {
      id: log.id,
      tenantId: log.tenantId,
      employeeId: log.employeeId,
      employeeCode: log.employee?.employeeCode,
      employeeName: `${log.employee?.firstName} ${log.employee?.lastName}`,
      activityId: log.activityId,
      activityCode: log.activity?.code,
      activityName: log.activity?.name,
      unit: log.activity?.unit,
      logDate: log.logDate.toISOString(),
      quantity: log.quantity,
      unitRate: log.unitRate,
      totalAmount: log.totalAmount,
      remarks: log.remarks,
      recordedBy: log.recordedBy,
      createdAt: log.createdAt.toISOString()
    };
  }

  async deleteLog(tenantId: string, id: string) {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const log = await this.prisma.pieceRateLog.findFirst({
      where: { id, tenantId: effectiveTenantId }
    });

    if (!log) {
      throw new NotFoundException(`Production log ${id} not found`);
    }

    return this.prisma.pieceRateLog.delete({
      where: { id }
    });
  }

  async saveEmployeeDayLogs(
    tenantId: string,
    dto: {
      employeeId: string;
      logDate: string;
      items: Array<{
        activityId: string;
        quantity: number;
        unitRate?: number;
        remarks?: string;
      }>;
    },
    recordedBy?: string
  ): Promise<PieceRateLogDto[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const safeRecordedBy = this.isValidUuid(recordedBy) ? recordedBy : null;

    let employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId: effectiveTenantId }
    });
    if (!employee) {
      employee = await this.prisma.employee.findFirst({
        where: { OR: [{ id: dto.employeeId }, { employeeCode: dto.employeeId }] }
      });
    }
    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    }

    const targetTenantId = employee.tenantId || effectiveTenantId;
    const targetEmployeeId = employee.id;

    const logDateObj = new Date(dto.logDate);
    const start = new Date(logDateObj);
    start.setHours(0, 0, 0, 0);
    const end = new Date(logDateObj);
    end.setHours(23, 59, 59, 999);

    // Delete existing logs for this employee on this date
    await this.prisma.pieceRateLog.deleteMany({
      where: {
        tenantId: targetTenantId,
        employeeId: targetEmployeeId,
        logDate: {
          gte: start,
          lte: end
        }
      }
    });

    const createdLogs: any[] = [];
    for (const item of dto.items) {
      const qty = Number(item.quantity);
      if (qty <= 0) continue;

      let activity = await this.prisma.pieceRateActivity.findFirst({
        where: { id: item.activityId, tenantId: targetTenantId }
      });
      if (!activity) {
        activity = await this.prisma.pieceRateActivity.findFirst({
          where: { OR: [{ id: item.activityId }, { code: item.activityId }] }
        });
      }
      if (!activity) continue;

      const rate = item.unitRate !== undefined && !isNaN(Number(item.unitRate)) 
        ? Number(item.unitRate) 
        : activity.ratePerUnit;
      const totalAmount = qty * rate;

      const log = await this.prisma.pieceRateLog.create({
        data: {
          tenantId: targetTenantId,
          employeeId: targetEmployeeId,
          activityId: activity.id,
          logDate: logDateObj,
          quantity: qty,
          unitRate: rate,
          totalAmount,
          remarks: item.remarks ? String(item.remarks).trim() : null,
          recordedBy: safeRecordedBy
        },
        include: {
          employee: {
            select: {
              employeeCode: true,
              firstName: true,
              lastName: true
            }
          },
          activity: {
            select: {
              code: true,
              name: true,
              unit: true
            }
          }
        }
      });
      createdLogs.push(log);
    }

    return createdLogs.map((l: any) => ({
      id: l.id,
      tenantId: l.tenantId,
      employeeId: l.employeeId,
      employeeCode: l.employee?.employeeCode,
      employeeName: `${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`.trim(),
      activityId: l.activityId,
      activityCode: l.activity?.code,
      activityName: l.activity?.name,
      unit: l.activity?.unit,
      logDate: l.logDate.toISOString(),
      quantity: l.quantity,
      unitRate: l.unitRate,
      totalAmount: l.totalAmount,
      remarks: l.remarks,
      recordedBy: l.recordedBy,
      createdAt: l.createdAt.toISOString()
    }));
  }

  async getMonthlyEmployeeSummary(
    tenantId: string,
    month: number,
    year: number
  ): Promise<PieceRateEmployeeSummaryDto[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const logs = await this.prisma.tenantClient.pieceRateLog.findMany({
      where: {
        tenantId,
        logDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        employee: true,
        activity: true
      }
    });

    const map = new Map<string, {
      employee: any;
      totalUnits: number;
      totalEarnings: number;
      activityMap: Map<string, PieceRateDetailItem>;
    }>();

    for (const log of logs) {
      if (!map.has(log.employeeId)) {
        map.set(log.employeeId, {
          employee: log.employee,
          totalUnits: 0,
          totalEarnings: 0,
          activityMap: new Map()
        });
      }

      const item = map.get(log.employeeId)!;
      item.totalUnits += log.quantity;
      item.totalEarnings += log.totalAmount;

      const actName = log.activity?.name || 'Production Activity';
      if (!item.activityMap.has(actName)) {
        item.activityMap.set(actName, {
          activityName: actName,
          units: 0,
          rate: log.unitRate,
          total: 0
        });
      }

      const actItem = item.activityMap.get(actName)!;
      actItem.units += log.quantity;
      actItem.total += log.totalAmount;
    }

    return Array.from(map.values()).map(val => ({
      employeeId: val.employee.id,
      employeeCode: val.employee.employeeCode,
      employeeName: `${val.employee.firstName} ${val.employee.lastName}`,
      department: val.employee.department,
      branch: val.employee.branch,
      totalUnits: val.totalUnits,
      totalEarnings: val.totalEarnings,
      activitiesCount: val.activityMap.size,
      breakdown: Array.from(val.activityMap.values())
    }));
  }
}
