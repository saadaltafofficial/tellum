import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from './auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Agent])],
  providers: [AuthService, ApiKeyGuard],
  exports: [AuthService, ApiKeyGuard],
})
export class AuthModule {}
