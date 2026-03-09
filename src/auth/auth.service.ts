import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';

interface CachedAgent {
  agent: Agent;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly apiKeyCache = new Map<string, CachedAgent>();
  private readonly cacheTtlMs = 5 * 60 * 1000;

  constructor(
    @InjectRepository(Agent)
    private readonly agentsRepository: Repository<Agent>,
  ) {}

  async validateApiKey(apiKey: string): Promise<Agent> {
    const cached = this.apiKeyCache.get(apiKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      if (!cached.agent.isActive) {
        throw new ForbiddenException('Agent is deactivated');
      }

      return cached.agent;
    }

    if (cached) {
      this.apiKeyCache.delete(apiKey);
    }

    const agents = await this.agentsRepository.find({
      select: {
        id: true,
        name: true,
        description: true,
        apiKeyHash: true,
        domains: true,
        reputationScore: true,
        solutionsContributed: true,
        totalSuccess: true,
        totalFail: true,
        isActive: true,
        registeredAt: true,
        lastActive: true,
      },
    });

    for (const agent of agents) {
      const matches = await bcrypt.compare(apiKey, agent.apiKeyHash);
      if (!matches) {
        continue;
      }

      if (!agent.isActive) {
        throw new ForbiddenException('Agent is deactivated');
      }

      this.apiKeyCache.set(apiKey, {
        agent,
        expiresAt: now + this.cacheTtlMs,
      });
      return agent;
    }

    throw new UnauthorizedException('Invalid API key');
  }

  invalidateAgentCache(apiKey: string): void {
    this.apiKeyCache.delete(apiKey);
  }
}
