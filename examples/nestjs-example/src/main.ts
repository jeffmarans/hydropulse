import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 NestJS Telemetry Example running on: http://localhost:${port}`);
  console.log(`📊 Telemetry data will be sent to configured providers`);
}

bootstrap().catch(console.error);
