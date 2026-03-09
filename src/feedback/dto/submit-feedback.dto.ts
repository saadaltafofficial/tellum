import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitFeedbackDto {
  @ApiProperty()
  @IsBoolean()
  success!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error_if_failed?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  environment?: Record<string, unknown>;
}
