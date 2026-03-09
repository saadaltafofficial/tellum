import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { RegisterAgentDto } from './dto/register-agent.dto';
import {
  AgentResponseDto,
  RegisterAgentResponseDto,
} from './dto/agent-response.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentsRepository: Repository<Agent>,
  ) {}

  async register(dto: RegisterAgentDto): Promise<RegisterAgentResponseDto> {
    const apiKey = `ao_live_${randomBytes(32).toString('hex')}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    const agent = this.agentsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      apiKeyHash,
      domains: dto.domains ?? [],
      reputationScore: 0,
      solutionsContributed: 0,
      totalSuccess: 0,
      totalFail: 0,
      isActive: true,
    });

    const savedAgent = await this.agentsRepository.save(agent);

    return {
      id: savedAgent.id,
      name: savedAgent.name,
      api_key: apiKey,
      message: 'Save this API key. It will not be shown again.',
    };
  }

  async getPublicProfile(id: string): Promise<AgentResponseDto> {
    const agent = await this.agentsRepository.findOne({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      domains: agent.domains,
      reputation_score: agent.reputationScore,
      solutions_contributed: agent.solutionsContributed,
      total_success: agent.totalSuccess,
      total_fail: agent.totalFail,
      registered_at: agent.registeredAt,
      last_active: agent.lastActive,
    };
  }
}
