import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { CreateSolutionDto } from './dto/create-solution.dto';
import {
  CreateSolutionResponseDto,
  SearchSolutionsResponseDto,
  SolutionDetailResponseDto,
} from './dto/solution-response.dto';
import { SearchSolutionsDto } from './dto/search-solutions.dto';

interface SolutionRow {
  id: string;
  domain: string;
  tools: string[];
  error_pattern: string;
  error_message: string | null;
  fix_steps: Array<Record<string, unknown>>;
  rollback_steps: Array<Record<string, unknown>> | null;
  variables: Record<string, unknown>;
  context: string | null;
  tags: string[];
  severity: string;
  estimated_fix_time_seconds: number | null;
  requires_downtime: boolean;
  success_rate: number;
  success_count: number;
  fail_count: number;
  confidence: number;
  created_at: Date;
  similarity?: number | null;
  agent_id: string;
  agent_name: string;
  agent_reputation_score: number;
}

@Injectable()
export class SolutionsService {
  constructor(private readonly dataSource: DataSource) {}

  async create(
    dto: CreateSolutionDto,
    agent: Agent,
  ): Promise<CreateSolutionResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const embeddingValue =
        dto.embedding && dto.embedding.length > 0
          ? this.toVectorLiteral(dto.embedding)
          : null;

      const rows = (await queryRunner.query(
        `
          INSERT INTO solutions (
            agent_id,
            domain,
            tools,
            environment,
            error_pattern,
            error_message,
            fix_steps,
            rollback_steps,
            variables,
            context,
            tags,
            severity,
            estimated_fix_time_seconds,
            requires_downtime,
            embedding
          )
          VALUES (
            $1,
            $2,
            $3::text[],
            $4::jsonb,
            $5,
            $6,
            $7::jsonb,
            $8::jsonb,
            $9::jsonb,
            $10,
            $11::text[],
            $12,
            $13,
            $14,
            $15::vector
          )
          RETURNING id, domain, status
        `,
        [
          agent.id,
          dto.domain,
          dto.tools ?? [],
          JSON.stringify(dto.environment ?? {}),
          dto.error_pattern,
          dto.error_message ?? null,
          JSON.stringify(dto.fix_steps),
          JSON.stringify(dto.rollback_steps ?? null),
          JSON.stringify(dto.variables ?? {}),
          dto.context ?? null,
          dto.tags ?? [],
          dto.severity ?? 'medium',
          dto.estimated_fix_time_seconds ?? null,
          dto.requires_downtime ?? false,
          embeddingValue,
        ],
      )) as Array<{ id: string; domain: string; status: string }>;

      await queryRunner.query(
        `
          UPDATE agents
          SET
            solutions_contributed = solutions_contributed + 1,
            last_active = NOW()
          WHERE id = $1
        `,
        [agent.id],
      );

      await queryRunner.commitTransaction();

      return {
        id: rows[0].id,
        message: 'Solution submitted',
        domain: rows[0].domain,
        status: rows[0].status,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async search(dto: SearchSolutionsDto): Promise<SearchSolutionsResponseDto> {
    const startedAt = Date.now();
    const limit = dto.limit ?? 10;
    let rows: SolutionRow[];

    if (dto.embedding?.length) {
      rows = (await this.dataSource.query(
        `
          SELECT
            s.id,
            s.domain,
            s.tools,
            s.error_pattern,
            s.error_message,
            s.fix_steps,
            s.rollback_steps,
            s.variables,
            s.context,
            s.tags,
            s.severity,
            s.estimated_fix_time_seconds,
            s.requires_downtime,
            s.success_rate,
            s.success_count,
            s.fail_count,
            s.confidence,
            s.created_at,
            a.id AS agent_id,
            a.name AS agent_name,
            a.reputation_score AS agent_reputation_score,
            1 - (s.embedding <=> $1::vector) AS similarity
          FROM solutions s
          INNER JOIN agents a ON a.id = s.agent_id
          WHERE s.status = 'active'
            AND ($2::varchar IS NULL OR s.domain = $2)
            AND ($3::text[] IS NULL OR s.tools && $3)
            AND ($4::text[] IS NULL OR s.tags && $4)
            AND ($5::varchar IS NULL OR s.severity = $5)
          ORDER BY similarity DESC NULLS LAST, s.success_rate DESC
          LIMIT $6
        `,
        [
          this.toVectorLiteral(dto.embedding),
          dto.domain ?? null,
          dto.tools?.length ? dto.tools : null,
          dto.tags?.length ? dto.tags : null,
          dto.severity ?? null,
          limit,
        ],
      )) as SolutionRow[];
    } else {
      rows = (await this.dataSource.query(
        `
          SELECT
            s.id,
            s.domain,
            s.tools,
            s.error_pattern,
            s.error_message,
            s.fix_steps,
            s.rollback_steps,
            s.variables,
            s.context,
            s.tags,
            s.severity,
            s.estimated_fix_time_seconds,
            s.requires_downtime,
            s.success_rate,
            s.success_count,
            s.fail_count,
            s.confidence,
            s.created_at,
            a.id AS agent_id,
            a.name AS agent_name,
            a.reputation_score AS agent_reputation_score,
            ts_rank(
              to_tsvector(
                'english',
                s.error_pattern || ' ' || COALESCE(s.error_message, '') || ' ' || COALESCE(s.context, '') || ' ' || array_to_string(s.tags, ' ')
              ),
              plainto_tsquery('english', $1)
            ) AS similarity
          FROM solutions s
          INNER JOIN agents a ON a.id = s.agent_id
          WHERE s.status = 'active'
            AND ($2::varchar IS NULL OR s.domain = $2)
            AND ($3::text[] IS NULL OR s.tools && $3)
            AND ($4::text[] IS NULL OR s.tags && $4)
            AND ($5::varchar IS NULL OR s.severity = $5)
          ORDER BY similarity DESC NULLS LAST, s.success_rate DESC
          LIMIT $6
        `,
        [
          dto.query,
          dto.domain ?? null,
          dto.tools?.length ? dto.tools : null,
          dto.tags?.length ? dto.tags : null,
          dto.severity ?? null,
          limit,
        ],
      )) as SolutionRow[];
    }

    return {
      results: rows.map((row) => this.mapSolutionRow(row)),
      total: rows.length,
      search_time_ms: Date.now() - startedAt,
    };
  }

  async getById(id: string): Promise<SolutionDetailResponseDto> {
    const rows = (await this.dataSource.query(
      `
        SELECT
          s.id,
          s.domain,
          s.tools,
          s.error_pattern,
          s.error_message,
          s.fix_steps,
          s.rollback_steps,
          s.variables,
          s.context,
          s.tags,
          s.severity,
          s.estimated_fix_time_seconds,
          s.requires_downtime,
          s.success_rate,
          s.success_count,
          s.fail_count,
          s.confidence,
          s.created_at,
          a.id AS agent_id,
          a.name AS agent_name,
          a.reputation_score AS agent_reputation_score
        FROM solutions s
        INNER JOIN agents a ON a.id = s.agent_id
        WHERE s.id = $1
      `,
      [id],
    )) as SolutionRow[];

    if (!rows[0]) {
      throw new NotFoundException('Solution not found');
    }

    return this.mapSolutionRow(rows[0]);
  }

  private mapSolutionRow(row: SolutionRow): SolutionDetailResponseDto {
    return {
      id: row.id,
      domain: row.domain,
      tools: row.tools,
      error_pattern: row.error_pattern,
      error_message: row.error_message,
      fix_steps: row.fix_steps,
      rollback_steps: row.rollback_steps,
      variables: row.variables ?? {},
      context: row.context,
      tags: row.tags ?? [],
      severity: row.severity,
      estimated_fix_time_seconds:
        row.estimated_fix_time_seconds === null
          ? null
          : Number(row.estimated_fix_time_seconds),
      requires_downtime: Boolean(row.requires_downtime),
      success_rate: Number(row.success_rate),
      success_count: Number(row.success_count),
      fail_count: Number(row.fail_count),
      confidence: Number(row.confidence),
      agent: {
        id: row.agent_id,
        name: row.agent_name,
        reputation_score: Number(row.agent_reputation_score),
      },
      similarity: row.similarity === undefined ? null : Number(row.similarity),
      created_at: row.created_at,
    };
  }

  private toVectorLiteral(values: number[]): string {
    return `[${values.join(',')}]`;
  }
}
