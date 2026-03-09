import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Agent } from '../agents/entities/agent.entity';

export interface AuthenticatedRequest extends Request {
  agent?: Agent;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = request.header('X-API-Key');

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    request.agent = await this.authService.validateApiKey(apiKey);
    return true;
  }
}
