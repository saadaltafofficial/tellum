import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuthenticatedRequest } from '../../auth/auth.guard';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      tap(() => {
        this.writeAuditLog(request, response.statusCode);
      }),
      catchError((error: unknown) => {
        const statusCode =
          typeof error === 'object' &&
          error !== null &&
          'getStatus' in error &&
          typeof error.getStatus === 'function'
            ? (error.getStatus() as number)
            : 500;

        this.writeAuditLog(request, statusCode);
        return throwError(() => error);
      }),
    );
  }

  private writeAuditLog(
    request: AuthenticatedRequest,
    statusCode: number,
  ): void {
    void this.auditLogRepository.insert({
      agentId: request.agent?.id ?? null,
      action: `${request.method} ${request.route?.path ?? request.path}`,
      endpoint: request.originalUrl,
      method: request.method,
      statusCode,
      ipAddress: request.ip,
    });
  }
}
