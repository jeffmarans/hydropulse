import { Module, DynamicModule, Global } from '@nestjs/common';
import { TelemetryCore } from '../../core/telemetry.core';
import { TelemetryConfig } from '../../interfaces/telemetry.interfaces';
import { TelemetryInterceptor } from './telemetry.interceptor';
import { loadHydropulseConfig } from '../../config/env-loader';

export interface TelemetryModuleOptions {
  config?: TelemetryConfig;
  isGlobal?: boolean;
}

@Global()
@Module({})
export class TelemetryModule {
  static forRoot(options: TelemetryModuleOptions = {}): DynamicModule {
    const config = options.config || loadHydropulseConfig();
    
    const telemetryProvider = {
      provide: 'TELEMETRY_CONFIG',
      useValue: config,
    };

    const telemetryCoreProvider = {
      provide: TelemetryCore,
      useFactory: async (config: TelemetryConfig) => {
        const core = new TelemetryCore(config);
        await core.initialize();
        return core;
      },
      inject: ['TELEMETRY_CONFIG'],
    };

    return {
      module: TelemetryModule,
      global: options.isGlobal !== false,
      providers: [
        telemetryProvider,
        telemetryCoreProvider,
        TelemetryInterceptor,
      ],
      exports: [TelemetryCore, TelemetryInterceptor],
    };
  }

  static forEnvironment(options: { isGlobal?: boolean } = {}): DynamicModule {
    const telemetryCoreProvider = {
      provide: TelemetryCore,
      useFactory: async () => {
        const core = TelemetryCore.fromEnvironment();
        await core.initialize();
        return core;
      },
    };

    return {
      module: TelemetryModule,
      global: options.isGlobal !== false,
      providers: [
        telemetryCoreProvider,
        TelemetryInterceptor,
      ],
      exports: [TelemetryCore, TelemetryInterceptor],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<TelemetryConfig> | TelemetryConfig;
    inject?: any[];
    isGlobal?: boolean;
  }): DynamicModule {
    const telemetryProvider = {
      provide: 'TELEMETRY_CONFIG',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const telemetryCoreProvider = {
      provide: TelemetryCore,
      useFactory: async (config: TelemetryConfig) => {
        const core = new TelemetryCore(config);
        await core.initialize();
        return core;
      },
      inject: ['TELEMETRY_CONFIG'],
    };

    return {
      module: TelemetryModule,
      global: options.isGlobal !== false,
      providers: [
        telemetryProvider,
        telemetryCoreProvider,
        TelemetryInterceptor,
      ],
      exports: [TelemetryCore, TelemetryInterceptor],
    };
  }
}
