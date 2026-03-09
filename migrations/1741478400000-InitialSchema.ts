import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1741478400000 implements MigrationInterface {
  name = 'InitialSchema1741478400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');

    await queryRunner.query(`
      CREATE TABLE agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        api_key_hash VARCHAR(500) NOT NULL,
        domains TEXT[] DEFAULT '{}',
        reputation_score FLOAT DEFAULT 0,
        solutions_contributed INTEGER DEFAULT 0,
        total_success INTEGER DEFAULT 0,
        total_fail INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        registered_at TIMESTAMPTZ DEFAULT NOW(),
        last_active TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_agents_reputation ON agents(reputation_score DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE solutions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID NOT NULL REFERENCES agents(id),
        domain VARCHAR(100) NOT NULL,
        tools TEXT[] DEFAULT '{}',
        environment JSONB DEFAULT '{}'::jsonb,
        error_pattern TEXT NOT NULL,
        error_message TEXT,
        fix_steps JSONB NOT NULL,
        rollback_steps JSONB,
        variables JSONB DEFAULT '{}'::jsonb,
        context TEXT,
        tags TEXT[] DEFAULT '{}',
        severity VARCHAR(20) DEFAULT 'medium',
        estimated_fix_time_seconds INTEGER,
        requires_downtime BOOLEAN DEFAULT false,
        embedding vector(1536),
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        success_rate FLOAT DEFAULT 0,
        confidence FLOAT DEFAULT 0.5,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_solutions_domain ON solutions(domain)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_solutions_embedding
      ON solutions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_solutions_success_rate ON solutions(success_rate DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_solutions_tools ON solutions USING gin (tools)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_solutions_tags ON solutions USING gin (tags)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_solutions_severity ON solutions(severity)
    `);

    await queryRunner.query(`
      CREATE TABLE feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        solution_id UUID NOT NULL REFERENCES solutions(id),
        agent_id UUID NOT NULL REFERENCES agents(id),
        success BOOLEAN NOT NULL,
        context TEXT,
        error_if_failed TEXT,
        environment JSONB DEFAULT '{}'::jsonb,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_feedback_solution ON feedback(solution_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_feedback_agent ON feedback(agent_id)
    `);

    await queryRunner.query(`
      CREATE TABLE audit_log (
        id BIGSERIAL PRIMARY KEY,
        agent_id UUID,
        action VARCHAR(100) NOT NULL,
        endpoint VARCHAR(200),
        method VARCHAR(10),
        status_code INTEGER,
        ip_address INET,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_audit_created ON audit_log(created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_audit_created');
    await queryRunner.query('DROP TABLE IF EXISTS audit_log');
    await queryRunner.query('DROP INDEX IF EXISTS idx_feedback_agent');
    await queryRunner.query('DROP INDEX IF EXISTS idx_feedback_solution');
    await queryRunner.query('DROP TABLE IF EXISTS feedback');
    await queryRunner.query('DROP INDEX IF EXISTS idx_solutions_severity');
    await queryRunner.query('DROP INDEX IF EXISTS idx_solutions_tags');
    await queryRunner.query('DROP INDEX IF EXISTS idx_solutions_tools');
    await queryRunner.query('DROP INDEX IF EXISTS idx_solutions_success_rate');
    await queryRunner.query('DROP INDEX IF EXISTS idx_solutions_embedding');
    await queryRunner.query('DROP INDEX IF EXISTS idx_solutions_domain');
    await queryRunner.query('DROP TABLE IF EXISTS solutions');
    await queryRunner.query('DROP INDEX IF EXISTS idx_agents_reputation');
    await queryRunner.query('DROP TABLE IF EXISTS agents');
  }
}
