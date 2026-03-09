import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Solution } from '../../solutions/entities/solution.entity';
import { Feedback } from '../../feedback/entities/feedback.entity';

@Entity({ name: 'agents' })
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'api_key_hash', type: 'varchar', length: 500 })
  apiKeyHash!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  domains!: string[];

  @Column({ name: 'reputation_score', type: 'float', default: 0 })
  reputationScore!: number;

  @Column({ name: 'solutions_contributed', type: 'integer', default: 0 })
  solutionsContributed!: number;

  @Column({ name: 'total_success', type: 'integer', default: 0 })
  totalSuccess!: number;

  @Column({ name: 'total_fail', type: 'integer', default: 0 })
  totalFail!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({
    name: 'registered_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  registeredAt!: Date;

  @Column({
    name: 'last_active',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  lastActive!: Date;

  @OneToMany(() => Solution, (solution) => solution.agent)
  solutions!: Solution[];

  @OneToMany(() => Feedback, (feedback) => feedback.agent)
  feedbackEntries!: Feedback[];
}
