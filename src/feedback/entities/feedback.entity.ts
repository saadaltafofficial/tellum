import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Solution } from '../../solutions/entities/solution.entity';
import { Agent } from '../../agents/entities/agent.entity';

@Entity({ name: 'feedback' })
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'solution_id', type: 'uuid' })
  solutionId!: string;

  @ManyToOne(() => Solution, { nullable: false })
  @JoinColumn({ name: 'solution_id' })
  solution!: Solution;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId!: string;

  @ManyToOne(() => Agent, (agent) => agent.feedbackEntries, { nullable: false })
  @JoinColumn({ name: 'agent_id' })
  agent!: Agent;

  @Column({ type: 'boolean' })
  success!: boolean;

  @Column({ type: 'text', nullable: true })
  context!: string | null;

  @Column({ name: 'error_if_failed', type: 'text', nullable: true })
  errorIfFailed!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  environment!: Record<string, unknown>;

  @Column({ name: 'applied_at', type: 'timestamptz', default: () => 'NOW()' })
  appliedAt!: Date;
}
