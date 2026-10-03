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

  async listActivities(tenantId: string): Promise<PieceRateActivityDto[]> {
    let activities = await this.prisma.tenantClient.pieceRateActivity.findMany({
      where: { tenantId },
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

      await this.prisma.tenantClient.pieceRateActivity.createMany({
        data: defaults.map(d => ({
          tenantId,
          ...d
        }))
      });

      activities = await this.prisma.tenantClient.pieceRateActivity.findMany({
        where: { tenantId },
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
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.tenantClient.pieceRateActivity.findFirst({
      where: { tenantId, code }
    });

    if (existing) {
      throw new ConflictException(`Activity code "${code}" already exists in this organization`);
    }

    const activity = await this.prisma.tenantClient.pieceRateActivity.create({
      data: {
        tenantId,
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
    const where: any = { tenantId };
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

    const logs = await this.prisma.tenantClient.pieceRateLog.findMany({
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
    // 1. Verify Employee
    const employee = await this.prisma.tenantClient.employee.findFirst({
      where: { id: dto.employeeId, tenantId }
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    }

    // 2. Verify Activity
    const activity = await this.prisma.tenantClient.pieceRateActivity.findFirst({
      where: { id: dto.activityId, tenantId }
    });
    if (!activity) {
      throw new NotFoundException(`Activity ${dto.activityId} not found`);
    }

    const unitRate = dto.unitRate !== undefined ? Number(dto.unitRate) : activity.ratePerUnit;
    const quantity = Number(dto.quantity);
    const totalAmount = quantity * unitRate;

    const log = await this.prisma.tenantClient.pieceRateLog.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        activityId: dto.activityId,
        logDate: new Date(dto.logDate),
        quantity,
        unitRate,
        totalAmount,
        remarks: dto.remarks || null,
        recordedBy: recordedBy || null
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
    const log = await this.prisma.tenantClient.pieceRateLog.findFirst({
      where: { id, tenantId }
    });

    if (!log) {
      throw new NotFoundException(`Production log ${id} not found`);
    }

    return this.prisma.tenantClient.pieceRateLog.delete({
      where: { id }
    });
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
