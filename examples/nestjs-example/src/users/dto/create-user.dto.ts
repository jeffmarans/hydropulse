import { IsEmail, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;
}
