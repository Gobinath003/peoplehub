import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from './tenant-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Returns a Prisma Client instance that automatically enforces tenant isolation filters
   * for tenant-scoped tables based on the AsyncLocalStorage context.
   */
  get tenantClient() {
    return this._extendedClient;
  }

  private _extendedClient = this.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const tenantId = TenantContext.getTenantId();
          const tenantScopedModels = [
            'TenantModule',
            'TenantUser',
            'UserRoleAssignment',
            'AuditLog',
            'Role',
            'Employee',
            'Department',
            'Designation',
            'Branch',
            'Shift',
            'EmploymentType',
            'SalaryStructure',
            'Payslip',
            'PieceRateActivity',
            'PieceRateLog'
          ];

          // Modify arguments for queries on tenant-scoped models if a tenant context exists
          if (tenantId && tenantScopedModels.includes(model)) {
            // Write operations that create record should automatically inject tenant_id
            if (operation === 'create') {
              args.data = args.data || {};
              if (model !== 'Role' || (model === 'Role' && !args.data.isSystem)) {
                args.data.tenantId = tenantId;
              }
            } else if (operation === 'createMany') {
              if (Array.isArray(args.data)) {
                args.data = args.data.map((item: any) => {
                  if (model !== 'Role' || (model === 'Role' && !item.isSystem)) {
                    return { ...item, tenantId };
                  }
                  return item;
                });
              } else {
                args.data = args.data || {};
                args.data.tenantId = tenantId;
              }
            } else if (operation === 'update' || operation === 'updateMany' || operation === 'delete' || operation === 'deleteMany' || operation === 'findUnique' || operation === 'findFirst' || operation === 'findMany' || operation === 'count' || operation === 'aggregate' || operation === 'groupBy') {
              args.where = args.where || {};
              
              if (model === 'Role') {
                // For Roles, allow retrieving tenant specific roles OR system global roles (null)
                const currentWhere = { ...args.where };
                if (currentWhere.tenantId) {
                  // Explicit tenantId filter provided, keep it
                } else {
                  args.where = {
                    ...currentWhere,
                    OR: [
                      { tenantId: tenantId },
                      { tenantId: null }
                    ]
                  };
                }
              } else {
                // Force active tenant filter
                args.where.tenantId = tenantId;
              }
            }
          }

          return query(args);
        }
      }
    }
  });
}
