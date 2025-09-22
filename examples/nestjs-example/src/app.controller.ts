import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { TrackMetric, TrackTrace } from '@jeffmarans/hydropulse';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @TrackTrace('app_root_endpoint')
  @TrackMetric('app_root_requests')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @TrackMetric('health_check_requests')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
    };
  }

  @Get('metrics')
  @TrackTrace('metrics_endpoint')
  async getMetrics() {
    const metrics = await this.appService.getBusinessMetrics();
    return {
      business_metrics: metrics,
      system_metrics: {
        memory_usage: process.memoryUsage(),
        cpu_usage: process.cpuUsage(),
        uptime: process.uptime(),
      },
    };
  }

  @Post('simulate-error')
  @TrackTrace('simulate_error')
  @TrackMetric('error_simulation_requests')
  simulateError(@Body() body: { type?: string; message?: string }) {
    const errorType = body.type || 'generic';
    const message = body.message || 'Simulated error for testing';

    switch (errorType) {
      case 'validation':
        throw new HttpException('Validation failed', HttpStatus.BAD_REQUEST);
      case 'not-found':
        throw new HttpException('Resource not found', HttpStatus.NOT_FOUND);
      case 'server':
        throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
      default:
        throw new Error(message);
    }
  }

  @Get('simulate-load')
  @TrackTrace('simulate_load')
  @TrackMetric('load_simulation_requests')
  async simulateLoad(@Query('duration') duration: string = '1000') {
    const durationMs = parseInt(duration, 10);
    const startTime = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, Math.min(durationMs, 10000)));
    
    const endTime = Date.now();
    const actualDuration = endTime - startTime;
    
    return {
      requested_duration: durationMs,
      actual_duration: actualDuration,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('database-test')
  @TrackTrace('database_test')
  @TrackMetric('database_test_requests')
  async testDatabase() {
    return await this.appService.testDatabaseOperations();
  }
}
