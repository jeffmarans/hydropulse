import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { TelemetryCore } from '../../core/telemetry.core';

@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
  constructor(private readonly telemetryCore: TelemetryCore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers['user-agent'];
    const userId = request.user?.id || request.headers['x-user-id'];
    
    const spanId = this.telemetryCore.traces.startSpan(`HTTP ${method}`, {
      http_method: method,
      http_url: url,
      http_user_agent: userAgent,
      user_id: userId,
    });

    return next.handle().pipe(
      tap(async () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode = response.statusCode;

        await this.telemetryCore.traces.finishSpan(await spanId, {
          http_status_code: statusCode,
          http_duration_ms: duration,
          success: statusCode < 400,
        });

        await this.telemetryCore.metrics.recordResponseTime(
          url,
          method,
          statusCode,
          duration
        );

        await this.telemetryCore.logs.logHttpRequest(
          method,
          url,
          statusCode,
          duration,
          userAgent,
          userId
        );
      }),
      catchError(async (error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode = response.statusCode || 500;

        await this.telemetryCore.traces.finishSpan(await spanId, {
          http_status_code: statusCode,
          http_duration_ms: duration,
          success: false,
        }, error);

        await this.telemetryCore.metrics.recordResponseTime(
          url,
          method,
          statusCode,
          duration
        );

        await this.telemetryCore.logs.logErrorWithContext(error, {
          operation: `HTTP ${method} ${url}`,
          userId,
          requestId: request.headers['x-request-id'],
          additionalData: {
            http_method: method,
            http_url: url,
            http_status_code: statusCode,
            http_duration_ms: duration,
          },
        });

        throw error;
      })
    );
  }
}
