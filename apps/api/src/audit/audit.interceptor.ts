import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { TenantContext } from '../prisma/tenant-context';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, ip, user } = request;
    const userAgent = request.headers['user-agent'];

    // Intercept modifying write requests
    const auditMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!auditMethods.includes(method)) {
      return next.handle();
    }

    const isAuth = url.includes('/auth/');

    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            const tenantId = TenantContext.getTenantId() || (user ? user.tenantId : null);
            const userId = user ? user.id : null;

            let entityId = null;
            if (response && typeof response === 'object' && response.id) {
              entityId = response.id;
            }

            const action = `${method} ${url}`;

            // Clean request payload to avoid logging passwords or secrets
            const safeBody = { ...body };
            if (isAuth) {
              if (safeBody.passwordHash) safeBody.passwordHash = '[REDACTED]';
              if (safeBody.password) safeBody.password = '[REDACTED]';
              if (safeBody.refreshToken) safeBody.refreshToken = '[REDACTED]';
            }

            await this.auditService.log({
              tenantId,
              userId,
              action,
              entityName: this.deriveEntityName(url),
              entityId,
              oldValues: null,
              newValues: Object.keys(safeBody).length > 0 ? safeBody : null,
              ipAddress: ip,
              userAgent
            });
          } catch (e) {
            // Silently log interception failures to avoid breaking the main request
            console.error('Audit Log Interception Failure:', e);
          }
        }
      })
    );
  }

  private deriveEntityName(url: string): string {
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split('/');
    // Extract main entity segment
    const segment = parts.find(p => p && p !== 'api' && p !== 'v1') || 'System';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }
}
