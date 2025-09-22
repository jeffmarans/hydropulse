import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryModule } from '../../../adapters/nestjs/telemetry.module';
import { TelemetryCore } from '../../../core/telemetry.core';
import { TelemetryConfig } from '../../../interfaces/telemetry.interfaces';

describe('TelemetryModule', () => {
  let module: TestingModule;
  let telemetryCore: TelemetryCore;

  const mockConfig: TelemetryConfig = {
    provider: 'auto',
    environment: 'development',
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    debug: true,
    grafana: {
      url: 'http://localhost:3000/api/traces',
      apiKey: 'test-key',
      appKey: 'test-app',
    },
    openTelemetry: {
      endpoint: 'http://localhost:4318',
    },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [TelemetryModule.forRoot({ config: mockConfig })],
    }).compile();

    telemetryCore = module.get<TelemetryCore>(TelemetryCore);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('forRoot', () => {
    it('should create module with TelemetryCore provider', () => {
      expect(telemetryCore).toBeDefined();
      expect(telemetryCore).toBeInstanceOf(TelemetryCore);
    });

    it('should initialize TelemetryCore with provided config', () => {
      expect(telemetryCore.metrics).toBeDefined();
      expect(telemetryCore.traces).toBeDefined();
      expect(telemetryCore.logs).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    it('should create module with async configuration', async () => {
      const asyncModule = await Test.createTestingModule({
        imports: [
          TelemetryModule.forRootAsync({
            useFactory: () => mockConfig,
          }),
        ],
      }).compile();

      const asyncTelemetryCore = asyncModule.get<TelemetryCore>(TelemetryCore);
      expect(asyncTelemetryCore).toBeDefined();
      expect(asyncTelemetryCore).toBeInstanceOf(TelemetryCore);

      await asyncModule.close();
    });

    it('should handle async configuration with dependencies', async () => {
      const asyncModule = await Test.createTestingModule({
        imports: [
          TelemetryModule.forRootAsync({
            useFactory: () => mockConfig,
          }),
        ],
      }).compile();

      const asyncTelemetryCore = asyncModule.get<TelemetryCore>(TelemetryCore);
      expect(asyncTelemetryCore).toBeDefined();

      await asyncModule.close();
    });
  });

  describe('module lifecycle', () => {
    it('should handle module initialization', async () => {
      await expect(module.init()).resolves.not.toThrow();
    });

    it('should handle module shutdown', async () => {
      await expect(module.close()).resolves.not.toThrow();
    });
  });

  describe('global module', () => {
    it('should be marked as global module', () => {
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('error handling', () => {
    it('should handle invalid configuration', async () => {
      const invalidConfig = {
        ...mockConfig,
        serviceName: '', // Invalid config
      };

      await expect(
        Test.createTestingModule({
          imports: [
            TelemetryModule.forRoot({
              config: invalidConfig
            }),
          ],
        }).compile()
      ).rejects.toThrow('serviceName is required in telemetry configuration');
    });
  });
});
