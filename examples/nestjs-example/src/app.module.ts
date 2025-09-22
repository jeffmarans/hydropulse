import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryModule } from '@jeffmarans/hydropulse';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { User } from './users/entities/user.entity';
import { Product } from './products/entities/product.entity';

@Module({
  imports: [
    TelemetryModule.forEnvironment(),
    
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Product],
      synchronize: true,
      logging: process.env.NODE_ENV === 'development',
    }),
    
    UsersModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
