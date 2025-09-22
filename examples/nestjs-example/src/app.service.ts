import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Product } from './products/entities/product.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  getHello(): string {
    return 'Hello World! This is a NestJS application with telemetry integration.';
  }

  async getBusinessMetrics() {
    const userCount = await this.usersRepository.count();
    const productCount = await this.productsRepository.count();
    
    return {
      total_users: userCount,
      total_products: productCount,
      active_connections: 1, // Simulated
      requests_per_minute: Math.floor(Math.random() * 100), // Simulated
      error_rate: Math.random() * 0.05, // Simulated 0-5% error rate
    };
  }

  async testDatabaseOperations() {
    try {
      const user = this.usersRepository.create({
        name: `Test User ${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        age: Math.floor(Math.random() * 50) + 18,
      });
      const savedUser = await this.usersRepository.save(user);

      const product = this.productsRepository.create({
        name: `Test Product ${Date.now()}`,
        price: Math.floor(Math.random() * 1000) + 10,
        description: 'A test product for telemetry demonstration',
      });
      const savedProduct = await this.productsRepository.save(product);

      const allUsers = await this.usersRepository.find();
      const allProducts = await this.productsRepository.find();

      return {
        operations_completed: 4,
        created_user: savedUser,
        created_product: savedProduct,
        total_users: allUsers.length,
        total_products: allProducts.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Database operation failed: ${error.message}`);
    }
  }
}
