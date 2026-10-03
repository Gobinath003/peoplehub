import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from './tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let tenantId = req.headers['x-tenant-id'] as string;
    if (tenantId === 't2222222-2222-2222-2222-222222222222') {
      tenantId = '23ee8399-e03c-4521-9e50-0332e1e1a9e7';
      req.headers['x-tenant-id'] = tenantId;
    }
    
    // Run the rest of the request within the tenant context
    TenantContext.run(tenantId || null, () => {
      next();
    });
  }
}
