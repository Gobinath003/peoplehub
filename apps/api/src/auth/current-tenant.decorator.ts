import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../prisma/tenant-context';

export const CurrentTenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return TenantContext.getTenantId();
  },
);
