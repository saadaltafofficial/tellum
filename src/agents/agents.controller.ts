import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { RegisterAgentDto } from './dto/register-agent.dto';
import {
  AgentResponseDto,
  RegisterAgentResponseDto,
} from './dto/agent-response.dto';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new agent' })
  @ApiResponse({ status: 201, type: RegisterAgentResponseDto })
  register(
    @Body() dto: RegisterAgentDto,
  ): Promise<RegisterAgentResponseDto> {
    return this.agentsService.register(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a public agent profile' })
  @ApiResponse({ status: 200, type: AgentResponseDto })
  getAgent(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AgentResponseDto> {
    return this.agentsService.getPublicProfile(id);
  }
}
