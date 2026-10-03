import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    tenantId: string | null;
    userId: string | null;
    action: string;
    entityName: string;
    entityId: string | null;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // Write using base Prisma Client to bypass tenant check during login/logout
    // if tenantId is null, but if tenantId exists, it will write under the tenant.
    return this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        action: data.action,
        entityName: data.entityName,
        entityId: data.entityId,
        oldValues: data.oldValues || undefined,
        newValues: data.newValues || undefined,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      }
    });
  }

  async findMany(tenantId: string) {
    return this.prisma.tenantClient.auditLog.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
