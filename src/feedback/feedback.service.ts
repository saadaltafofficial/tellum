import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

interface SolutionCountersRow {
  success_count: number;
  fail_count: number;
}

@Injectable()
export class FeedbackService {
  constructor(private readonly dataSource: DataSource) {}

  async submit(
    solutionId: string,
    dto: SubmitFeedbackDto,
    agent: Agent,
  ): Promise<{
    message: string;
    solution_id: string;
    new_success_rate: number;
    new_confidence: number;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const solutionRows = (await queryRunner.query(
        'SELECT id, agent_id FROM solutions WHERE id = $1',
        [solutionId],
      )) as Array<{ id: string; agent_id: string }>;

      if (!solutionRows[0]) {
        throw new NotFoundException('Solution not found');
      }

      await queryRunner.query(
        `
          INSERT INTO feedback (
            solution_id,
            agent_id,
            success,
            context,
            error_if_failed,
            environment
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        `,
        [
          solutionId,
          agent.id,
          dto.success,
          dto.context ?? null,
          dto.error_if_failed ?? null,
          JSON.stringify(dto.environment ?? {}),
        ],
      );

      const counterField = dto.success ? 'success_count' : 'fail_count';
      const updatedSolution = (await queryRunner.query(
        `
          UPDATE solutions
          SET
            ${counterField} = ${counterField} + 1,
            updated_at = NOW()
          WHERE id = $1
          RETURNING success_count, fail_count
        `,
        [solutionId],
      )) as SolutionCountersRow[];

      const successCount = Number(updatedSolution[0].success_count);
      const failCount = Number(updatedSolution[0].fail_count);
      const total = successCount + failCount;
      const successRate = total === 0 ? 0 : successCount / total;
      const confidence = this.calculateWilsonLowerBound(successCount, failCount);

      await queryRunner.query(
        `
          UPDATE solutions
          SET success_rate = $2, confidence = $3, updated_at = NOW()
          WHERE id = $1
        `,
        [solutionId, successRate, confidence],
      );

      const contributingAgentId = solutionRows[0].agent_id;
      const agentCounterField = dto.success ? 'total_success' : 'total_fail';
      const updatedAgentRows = (await queryRunner.query(
        `
          UPDATE agents
          SET
            ${agentCounterField} = ${agentCounterField} + 1,
            last_active = NOW()
          WHERE id = $1
          RETURNING total_success, total_fail
        `,
        [contributingAgentId],
      )) as Array<{ total_success: number; total_fail: number }>;

      const agentSuccess = Number(updatedAgentRows[0].total_success);
      const agentFail = Number(updatedAgentRows[0].total_fail);
      const agentTotal = agentSuccess + agentFail;
      const reputation = agentTotal === 0 ? 0 : (agentSuccess / agentTotal) * 100;

      await queryRunner.query(
        `
          UPDATE agents
          SET reputation_score = $2
          WHERE id = $1
        `,
        [contributingAgentId, reputation],
      );

      await queryRunner.commitTransaction();

      return {
        message: 'Feedback recorded',
        solution_id: solutionId,
        new_success_rate: successRate,
        new_confidence: confidence,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private calculateWilsonLowerBound(success: number, fail: number): number {
    const total = success + fail;

    if (total === 0) {
      return 0.5;
    }

    const z = 1.96;
    const zSquared = z * z;
    const phat = success / total;
    const denominator = 1 + zSquared / total;
    const centre = phat + zSquared / (2 * total);
    const margin =
      z *
      Math.sqrt((phat * (1 - phat) + zSquared / (4 * total)) / total);

    return (centre - margin) / denominator;
  }
}
