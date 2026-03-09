import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SolutionSeverity } from './create-solution.dto';

export class SearchSolutionsDto {
  @ApiProperty({ example: 'CrashLoopBackOff container keeps restarting' })
  @IsString()
  query!: string;

  @ApiPropertyOptional({ example: 'kubernetes' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: SolutionSeverity })
  @IsOptional()
  @IsEnum(SolutionSeverity)
  severity?: SolutionSeverity;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1536)
  @ArrayMaxSize(1536)
  @IsNumber({}, { each: true })
  embedding?: number[];

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
