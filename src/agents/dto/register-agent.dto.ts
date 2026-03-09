import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegisterAgentDto {
  @ApiProperty({ example: 'devops-sentinel' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    example: 'DevSecOps agent managing K8s and Terraform',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: ['kubernetes', 'terraform', 'docker', 'ci-cd'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];
}
