import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterAgentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  api_key!: string;

  @ApiProperty()
  message!: string;
}

export class AgentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty({ type: [String] })
  domains!: string[];

  @ApiProperty()
  reputation_score!: number;

  @ApiProperty()
  solutions_contributed!: number;

  @ApiProperty()
  total_success!: number;

  @ApiProperty()
  total_fail!: number;

  @ApiProperty()
  registered_at!: Date;

  @ApiProperty()
  last_active!: Date;
}
