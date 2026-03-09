import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

@Entity({ name: 'solutions' })
export class Solution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId!: string;

  @ManyToOne(() => Agent, (agent) => agent.solutions, { nullable: false })
  @JoinColumn({ name: 'agent_id' })
  agent!: Agent;

  @Column({ type: 'varchar', length: 100 })
  domain!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tools!: string[];

  @Column({ type: 'jsonb', default: () => "'{}'" })
  environment!: Record<string, unknown>;

  @Column({ name: 'error_pattern', type: 'text' })
  errorPattern!: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'fix_steps', type: 'jsonb' })
  fixSteps!: Array<Record<string, unknown>>;

  @Column({ name: 'rollback_steps', type: 'jsonb', nullable: true })
  rollbackSteps!: Array<Record<string, unknown>> | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  variables!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  context!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  severity!: string;

  @Column({ name: 'estimated_fix_time_seconds', type: 'integer', nullable: true })
  estimatedFixTimeSeconds!: number | null;

  @Column({ name: 'requires_downtime', type: 'boolean', default: false })
  requiresDowntime!: boolean;

  @Column({ type: 'float4', array: true, nullable: true })
  embedding!: number[] | null;

  @Column({ name: 'success_count', type: 'integer', default: 0 })
  successCount!: number;

  @Column({ name: 'fail_count', type: 'integer', default: 0 })
  failCount!: number;

  @Column({ name: 'success_rate', type: 'float', default: 0 })
  successRate!: number;

  @Column({ type: 'float', default: 0.5 })
  confidence!: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
