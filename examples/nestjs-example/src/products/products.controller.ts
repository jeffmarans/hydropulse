import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TrackMetric, TrackTrace } from '@jeffmarans/hydropulse';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @TrackTrace('create_product')
  @TrackMetric('product_creation_requests')
  async create(@Body() createProductDto: CreateProductDto) {
    try {
      const product = await this.productsService.create(createProductDto);
      return {
        success: true,
        data: product,
        message: 'Product created successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to create product: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @TrackTrace('list_products')
  @TrackMetric('product_list_requests')
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new HttpException('Invalid pagination parameters', HttpStatus.BAD_REQUEST);
    }

    const products = await this.productsService.findAll(pageNum, limitNum);
    return {
      success: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
      },
    };
  }

  @Get(':id')
  @TrackTrace('get_product_by_id')
  @TrackMetric('product_detail_requests')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(+id);
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }
    
    return {
      success: true,
      data: product,
    };
  }

  @Patch(':id')
  @TrackTrace('update_product')
  @TrackMetric('product_update_requests')
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    try {
      const product = await this.productsService.update(+id, updateProductDto);
      return {
        success: true,
        data: product,
        message: 'Product updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update product: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @TrackTrace('delete_product')
  @TrackMetric('product_deletion_requests')
  async remove(@Param('id') id: string) {
    try {
      await this.productsService.remove(+id);
      return {
        success: true,
        message: 'Product deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to delete product: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/inventory')
  @TrackTrace('get_product_inventory')
  @TrackMetric('product_inventory_requests')
  async getInventory(@Param('id') id: string) {
    const product = await this.productsService.findOne(+id);
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      data: {
        product_id: product.id,
        current_stock: product.stock,
        is_available: product.isAvailable,
        last_updated: product.updatedAt,
        estimated_restock: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    };
  }
}
