import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../prisma/tenant-context';

export const CurrentTenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.effectiveTenantId || TenantContext.getTenantId() || req.headers['x-tenant-id'] || req.user?.tenantId;
  },
);
