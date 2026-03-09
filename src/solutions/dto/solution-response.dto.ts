import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SolutionAgentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  reputation_score!: number;
}

export class CreateSolutionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  domain!: string;

  @ApiProperty()
  status!: string;
}

export class SolutionDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  domain!: string;

  @ApiProperty({ type: [String] })
  tools!: string[];

  @ApiProperty()
  error_pattern!: string;

  @ApiPropertyOptional()
  error_message!: string | null;

  @ApiProperty({ type: [Object] })
  fix_steps!: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ type: [Object] })
  rollback_steps!: Array<Record<string, unknown>> | null;

  @ApiProperty({ type: Object })
  variables!: Record<string, unknown>;

  @ApiPropertyOptional()
  context!: string | null;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty()
  severity!: string;

  @ApiPropertyOptional()
  estimated_fix_time_seconds!: number | null;

  @ApiProperty()
  requires_downtime!: boolean;

  @ApiProperty()
  success_rate!: number;

  @ApiProperty()
  success_count!: number;

  @ApiProperty()
  fail_count!: number;

  @ApiProperty()
  confidence!: number;

  @ApiProperty({ type: SolutionAgentDto })
  agent!: SolutionAgentDto;

  @ApiProperty()
  created_at!: Date;

  @ApiPropertyOptional()
  similarity?: number | null;
}

export class SearchSolutionsResponseDto {
  @ApiProperty({ type: [SolutionDetailResponseDto] })
  results!: SolutionDetailResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  search_time_ms!: number;
}
