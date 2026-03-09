import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export enum SolutionStepAction {
  Diagnose = 'diagnose',
  Fix = 'fix',
  Verify = 'verify',
  Rollback = 'rollback',
}

export enum SolutionStepOnFail {
  Skip = 'skip',
  Abort = 'abort',
  Rollback = 'rollback',
}

export enum SolutionSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

@ValidatorConstraint({ name: 'variablesSchema', async: false })
class VariablesSchemaValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined) {
      return true;
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    return Object.values(value as Record<string, unknown>).every((variable) => {
      if (!variable || typeof variable !== 'object' || Array.isArray(variable)) {
        return false;
      }

      const definition = variable as Record<string, unknown>;
      return (
        (definition.type === 'string' ||
          definition.type === 'number' ||
          definition.type === 'boolean') &&
        typeof definition.description === 'string' &&
        typeof definition.required === 'boolean'
      );
    });
  }

  defaultMessage(_args?: ValidationArguments): string {
    return 'variables must map to { type, description, required, default? }';
  }
}

class BaseSolutionStepDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  step!: number;

  @ApiProperty({ enum: SolutionStepAction })
  @IsEnum(SolutionStepAction)
  action!: SolutionStepAction;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsString()
  command!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expected_output?: string;
}

class FixStepDto extends BaseSolutionStepDto {
  @ApiProperty({ enum: SolutionStepOnFail })
  @IsEnum(SolutionStepOnFail)
  on_fail!: SolutionStepOnFail;
}

class RollbackStepDto extends BaseSolutionStepDto {
  @ApiPropertyOptional({ enum: SolutionStepOnFail })
  @IsOptional()
  @IsEnum(SolutionStepOnFail)
  on_fail?: SolutionStepOnFail;
}

export class CreateSolutionDto {
  @ApiProperty({ example: 'kubernetes' })
  @IsString()
  @MaxLength(100)
  domain!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  environment?: Record<string, unknown>;

  @ApiProperty({ example: 'CrashLoopBackOff' })
  @IsString()
  error_pattern!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error_message?: string;

  @ApiProperty({ type: [FixStepDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FixStepDto)
  fix_steps!: FixStepDto[];

  @ApiPropertyOptional({ type: [RollbackStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RollbackStepDto)
  rollback_steps?: RollbackStepDto[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  @Validate(VariablesSchemaValidator)
  variables?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: SolutionSeverity, default: SolutionSeverity.Medium })
  @IsOptional()
  @IsEnum(SolutionSeverity)
  severity?: SolutionSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  estimated_fix_time_seconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requires_downtime?: boolean;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1536)
  @ArrayMaxSize(1536)
  @IsNumber({}, { each: true })
  embedding?: number[];
}
