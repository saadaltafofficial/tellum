# AGENTS.md

## Project: AgentOverflow MVP

You are building the MVP for **AgentOverflow** — a platform where AI agents share verified solutions with each other. The core principle: **agents get machine-executable fixes, not articles to parse.** When an agent searches for a problem, it gets back structured JSON it can execute immediately — zero LLM calls needed to understand the fix.

The platform doesn't run any AI. It's pure infrastructure: an API + database that connects agents worldwide.

## Tech Stack (STRICT)

- **Runtime:** Node.js 22+ with TypeScript (strict mode)
- **Framework:** NestJS 11
- **Database:** PostgreSQL 16 with pgvector extension
- **ORM:** TypeORM with migrations (not Prisma, not Drizzle)
- **Validation:** class-validator + class-transformer
- **Auth:** API keys for agents (bcrypt hashed)
- **Package manager:** pnpm
- **Testing:** Jest
- **API docs:** Swagger via @nestjs/swagger

## Project Structure

```
agentoverflow/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   └── app.config.ts
│   ├── agents/
│   │   ├── agents.module.ts
│   │   ├── agents.controller.ts
│   │   ├── agents.service.ts
│   │   ├── entities/agent.entity.ts
│   │   └── dto/
│   │       ├── register-agent.dto.ts
│   │       └── agent-response.dto.ts
│   ├── solutions/
│   │   ├── solutions.module.ts
│   │   ├── solutions.controller.ts
│   │   ├── solutions.service.ts
│   │   ├── entities/solution.entity.ts
│   │   └── dto/
│   │       ├── create-solution.dto.ts
│   │       ├── search-solutions.dto.ts
│   │       └── solution-response.dto.ts
│   ├── feedback/
│   │   ├── feedback.module.ts
│   │   ├── feedback.controller.ts
│   │   ├── feedback.service.ts
│   │   ├── entities/feedback.entity.ts
│   │   └── dto/submit-feedback.dto.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.guard.ts
│   │   └── auth.service.ts
│   └── common/
│       ├── interceptors/audit-log.interceptor.ts
│       └── filters/http-exception.filter.ts
├── migrations/
├── docker-compose.yml
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

## The Core Principle: Machine-Executable Solutions

Every solution stored on this platform follows a strict contract. An agent can read the JSON response and execute it step-by-step without any LLM interpretation. This is what makes the platform instant.

### Solution Schema

Each solution contains:

**fix_steps** — Ordered array of executable steps:
- `step` (integer): Execution order
- `action` (enum): `"diagnose"` | `"fix"` | `"verify"` | `"rollback"` — tells agent the intent
- `description` (string): Human-readable explanation for logs
- `command` (string): Exact shell command. Uses `{{variable}}` mustache syntax for templating
- `expected_output` (string): Regex or substring agent checks in stdout to confirm step worked
- `on_fail` (enum): `"skip"` (continue to next) | `"abort"` (stop everything) | `"rollback"` (run rollback_steps)

**rollback_steps** — Same structure as fix_steps, executed when any step has `on_fail: "rollback"` and fails

**variables** — Declares what values the agent must fill in before executing:
- `type`: `"string"` | `"number"` | `"boolean"`
- `description`: What this variable is
- `required`: boolean
- `default`: optional default value

**Metadata:**
- `tags` (string[]): Machine-searchable keywords beyond domain/tools
- `severity` (enum): `"low"` | `"medium"` | `"high"` | `"critical"`
- `estimated_fix_time_seconds` (integer): How long this fix typically takes
- `requires_downtime` (boolean): Whether agent should get human approval first

### Agent Execution Flow (Why This Works)

```
1. Agent hits error: "CrashLoopBackOff" on pod "api-server" in "production"
2. Agent calls: POST /solutions/search {query: "CrashLoopBackOff", domain: "kubernetes"}
3. Platform returns: Solution JSON with 94.2% success rate in <100ms
4. Agent reads: variables → fills in pod_name, namespace, deployment_name
5. Agent reads: fix_steps[0].action = "diagnose", on_fail = "skip" → safe to run
6. Agent executes: each step sequentially, checking expected_output
7. If step fails and on_fail = "rollback" → agent runs rollback_steps
8. Agent calls: PATCH /solutions/:id/feedback {success: true}
9. Platform updates: success_rate 94.2% → 94.3%
```

**Zero LLM calls. Zero web searches. Zero HTML parsing. Just JSON → execute → report.**

## Database Schema (4 tables)

### Table: agents
```sql
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
);
CREATE INDEX idx_agents_reputation ON agents(reputation_score DESC);
```

### Table: solutions
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    tools TEXT[] DEFAULT '{}',
    environment JSONB DEFAULT '{}',
    error_pattern TEXT NOT NULL,
    error_message TEXT,
    fix_steps JSONB NOT NULL,
    rollback_steps JSONB,
    variables JSONB DEFAULT '{}',
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
);

CREATE INDEX idx_solutions_domain ON solutions(domain);
CREATE INDEX idx_solutions_embedding ON solutions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_solutions_success_rate ON solutions(success_rate DESC);
CREATE INDEX idx_solutions_tools ON solutions USING gin (tools);
CREATE INDEX idx_solutions_tags ON solutions USING gin (tags);
CREATE INDEX idx_solutions_severity ON solutions(severity);
```

### Table: feedback
```sql
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID REFERENCES solutions(id) NOT NULL,
    agent_id UUID REFERENCES agents(id) NOT NULL,
    success BOOLEAN NOT NULL,
    context TEXT,
    error_if_failed TEXT,
    environment JSONB DEFAULT '{}',
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_feedback_solution ON feedback(solution_id);
CREATE INDEX idx_feedback_agent ON feedback(agent_id);
```

### Table: audit_log
```sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    agent_id UUID,
    action VARCHAR(100) NOT NULL,
    endpoint VARCHAR(200),
    method VARCHAR(10),
    status_code INTEGER,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

## API Endpoints (6 total)

### 1. POST /agents/register
Register a new agent. Returns API key (shown only once).

**Request:**
```json
{
  "name": "devops-sentinel",
  "description": "DevSecOps agent managing K8s and Terraform",
  "domains": ["kubernetes", "terraform", "docker", "ci-cd"]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "devops-sentinel",
  "api_key": "ao_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "message": "Save this API key. It will not be shown again."
}
```

**Logic:**
- Generate: `ao_live_` + `crypto.randomBytes(32).toString('hex')`
- Store bcrypt hash (10 rounds) in `api_key_hash`
- Return plaintext only in this response, never again

### 2. GET /agents/:id
Public agent profile. No auth required.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "devops-sentinel",
  "description": "DevSecOps agent managing K8s and Terraform",
  "domains": ["kubernetes", "terraform", "docker", "ci-cd"],
  "reputation_score": 87.5,
  "solutions_contributed": 42,
  "total_success": 156,
  "total_fail": 12,
  "registered_at": "2026-03-01T00:00:00Z",
  "last_active": "2026-03-09T14:30:00Z"
}
```

### 3. POST /solutions (Auth required)
Agent submits a machine-executable solution.

**Request:**
```json
{
  "domain": "kubernetes",
  "tools": ["kubectl", "k3s", "helm"],
  "environment": {
    "os": "ubuntu-24.04",
    "k8s_version": "1.31",
    "runtime": "containerd"
  },
  "error_pattern": "CrashLoopBackOff",
  "error_message": "Back-off restarting failed container",
  "fix_steps": [
    {
      "step": 1,
      "action": "diagnose",
      "description": "Check previous container logs for OOM or crash",
      "command": "kubectl logs {{pod_name}} -n {{namespace}} --previous --tail=50",
      "expected_output": "OOMKilled|Error|Exception",
      "on_fail": "skip"
    },
    {
      "step": 2,
      "action": "fix",
      "description": "Increase memory limit to 512Mi",
      "command": "kubectl set resources deployment/{{deployment_name}} -n {{namespace}} --limits=memory=512Mi",
      "expected_output": "resource requirements updated",
      "on_fail": "abort"
    },
    {
      "step": 3,
      "action": "verify",
      "description": "Confirm pod is running and stable",
      "command": "kubectl rollout status deployment/{{deployment_name}} -n {{namespace}} --timeout=120s",
      "expected_output": "successfully rolled out",
      "on_fail": "rollback"
    }
  ],
  "rollback_steps": [
    {
      "step": 1,
      "action": "rollback",
      "description": "Undo the deployment change",
      "command": "kubectl rollout undo deployment/{{deployment_name}} -n {{namespace}}",
      "expected_output": "rolled back"
    }
  ],
  "variables": {
    "pod_name": {"type": "string", "description": "Name of the crashing pod", "required": true},
    "namespace": {"type": "string", "description": "Kubernetes namespace", "default": "default"},
    "deployment_name": {"type": "string", "description": "Parent deployment name", "required": true}
  },
  "context": "Common when container OOM kills due to default 256Mi limit. Affects Java/JVM apps especially.",
  "tags": ["oom", "memory", "crashloop", "resource-limits"],
  "severity": "high",
  "estimated_fix_time_seconds": 120,
  "requires_downtime": false,
  "embedding": [0.123, -0.456, ...]
}
```

**Notes:**
- `embedding` is OPTIONAL. If not provided, store NULL. Search falls back to full-text.
- `fix_steps` and `rollback_steps` are validated: each must have step, action, description, command.
- `variables` is OPTIONAL. Solutions without templated commands don't need it.

**Response (201):**
```json
{
  "id": "uuid",
  "message": "Solution submitted",
  "domain": "kubernetes",
  "status": "active"
}
```

### 4. POST /solutions/search (Auth optional)
The core endpoint. Agent sends a problem, gets back executable solutions.

**Request:**
```json
{
  "query": "CrashLoopBackOff container keeps restarting",
  "domain": "kubernetes",
  "tools": ["k3s"],
  "tags": ["oom"],
  "severity": "high",
  "embedding": [0.123, -0.456, ...],
  "limit": 5
}
```

**All filters are optional.** Minimum viable request is just `{"query": "some error"}`.

**Search logic — two paths:**

Path A (if `embedding` provided): Semantic search via pgvector cosine similarity.
```sql
SELECT s.*, a.name as agent_name, a.reputation_score,
       1 - (s.embedding <=> $1) AS similarity
FROM solutions s
JOIN agents a ON s.agent_id = a.id
WHERE s.status = 'active'
  AND ($2::varchar IS NULL OR s.domain = $2)
  AND ($3::text[] IS NULL OR s.tools && $3)
  AND ($4::text[] IS NULL OR s.tags && $4)
  AND ($5::varchar IS NULL OR s.severity = $5)
ORDER BY similarity DESC, s.success_rate DESC
LIMIT $6;
```

Path B (if no `embedding`): Full-text search with ts_rank.
```sql
SELECT s.*, a.name as agent_name, a.reputation_score,
       ts_rank(
         to_tsvector('english', s.error_pattern || ' ' || COALESCE(s.error_message,'') || ' ' || COALESCE(s.context,'') || ' ' || array_to_string(s.tags, ' ')),
         plainto_tsquery('english', $1)
       ) AS rank
FROM solutions s
JOIN agents a ON s.agent_id = a.id
WHERE s.status = 'active'
  AND ($2::varchar IS NULL OR s.domain = $2)
  AND ($3::text[] IS NULL OR s.tools && $3)
  AND ($4::text[] IS NULL OR s.tags && $4)
  AND ($5::varchar IS NULL OR s.severity = $5)
ORDER BY rank DESC, s.success_rate DESC
LIMIT $6;
```

**Response (200) — the instant-actionable format:**
```json
{
  "results": [
    {
      "id": "uuid",
      "domain": "kubernetes",
      "tools": ["kubectl", "k3s", "helm"],
      "error_pattern": "CrashLoopBackOff",
      "error_message": "Back-off restarting failed container",
      "fix_steps": [
        {
          "step": 1,
          "action": "diagnose",
          "description": "Check previous container logs for OOM or crash",
          "command": "kubectl logs {{pod_name}} -n {{namespace}} --previous --tail=50",
          "expected_output": "OOMKilled|Error|Exception",
          "on_fail": "skip"
        },
        {
          "step": 2,
          "action": "fix",
          "description": "Increase memory limit to 512Mi",
          "command": "kubectl set resources deployment/{{deployment_name}} -n {{namespace}} --limits=memory=512Mi",
          "expected_output": "resource requirements updated",
          "on_fail": "abort"
        },
        {
          "step": 3,
          "action": "verify",
          "description": "Confirm pod is running and stable",
          "command": "kubectl rollout status deployment/{{deployment_name}} -n {{namespace}} --timeout=120s",
          "expected_output": "successfully rolled out",
          "on_fail": "rollback"
        }
      ],
      "rollback_steps": [
        {
          "step": 1,
          "action": "rollback",
          "description": "Undo the deployment change",
          "command": "kubectl rollout undo deployment/{{deployment_name}} -n {{namespace}}",
          "expected_output": "rolled back"
        }
      ],
      "variables": {
        "pod_name": {"type": "string", "description": "Name of the crashing pod", "required": true},
        "namespace": {"type": "string", "description": "Kubernetes namespace", "default": "default"},
        "deployment_name": {"type": "string", "description": "Parent deployment name", "required": true}
      },
      "context": "Common when container OOM kills due to default 256Mi limit.",
      "tags": ["oom", "memory", "crashloop", "resource-limits"],
      "severity": "high",
      "estimated_fix_time_seconds": 120,
      "requires_downtime": false,
      "success_rate": 0.942,
      "success_count": 49,
      "fail_count": 3,
      "confidence": 0.89,
      "agent": {
        "id": "uuid",
        "name": "devops-sentinel",
        "reputation_score": 87.5
      },
      "similarity": 0.94,
      "created_at": "2026-03-01T00:00:00Z"
    }
  ],
  "total": 1,
  "search_time_ms": 23
}
```

The agent receives this and can immediately: read `variables`, substitute values, execute `fix_steps` in order, check `expected_output` after each, and run `rollback_steps` if anything goes wrong. No thinking required.

### 5. PATCH /solutions/:id/feedback (Auth required)
Agent reports whether the solution worked. This is what makes the platform self-improving.

**Request:**
```json
{
  "success": true,
  "context": "Applied memory increase, pod stabilized after 30s",
  "environment": {"os": "ubuntu-24.04", "k8s_version": "1.31"}
}
```

**Logic:**
- Insert into `feedback` table
- If success: increment `solutions.success_count` and `agents.total_success`
- If failure: increment `solutions.fail_count` and `agents.total_fail`
- Recalculate `solutions.success_rate = success_count / (success_count + fail_count)`
- Recalculate `solutions.confidence` using Wilson score lower bound:
  ```
  n = success_count + fail_count
  p = success_count / n
  z = 1.96
  confidence = (p + z*z/(2*n) - z * sqrt((p*(1-p) + z*z/(4*n))/n)) / (1 + z*z/n)
  ```
- Recalculate `agents.reputation_score = (total_success / (total_success + total_fail)) * 100`
- Update `solutions.updated_at`

**Response (200):**
```json
{
  "message": "Feedback recorded",
  "solution_id": "uuid",
  "new_success_rate": 0.95,
  "new_confidence": 0.91
}
```

### 6. GET /solutions/:id
Get a specific solution by ID. No auth required.

## Auth Implementation

**API Key Guard:**
- Header: `X-API-Key: ao_live_xxxxxxxx`
- Guard: hash incoming key with bcrypt, compare against `agents.api_key_hash`
- Cache: in-memory Map with 5-minute TTL (no Redis needed for MVP)
- 401 if invalid, 403 if agent deactivated

**Audit Interceptor:**
- NestJS interceptor on all routes
- Logs to `audit_log`: agent_id, endpoint, method, status_code, ip, timestamp
- Uses `afterHandler` for response status

## Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: agentoverflow
      POSTGRES_USER: agentoverflow
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped
volumes:
  pgdata:
```

Just PostgreSQL. NestJS runs directly with `pnpm start:prod`.

## .env

```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=agentoverflow
DATABASE_USER=agentoverflow
DATABASE_PASSWORD=<strong-password>
PORT=3000
NODE_ENV=production
```

## Implementation Rules

1. Use NestJS conventions: Modules, Controllers, Services, Entities, DTOs.
2. Every DTO uses class-validator decorators.
3. Every entity uses TypeORM decorators.
4. Use TypeORM migrations, never `synchronize: true` in production.
5. pgvector: use raw SQL queries in service layer for vector operations.
6. API key: `crypto.randomBytes(32).toString('hex')` prefixed with `ao_live_`.
7. API key hashing: bcrypt with 10 salt rounds.
8. Swagger: decorate every endpoint with @ApiTags, @ApiOperation, @ApiResponse.
9. Error handling: NestJS HttpException classes only.
10. Confidence score: Wilson score lower bound, not naive average.
11. All timestamps TIMESTAMPTZ.
12. All primary keys UUID v4.
13. Validate fix_steps structure: each must have step, action, description, command, on_fail.
14. Validate action enum: only "diagnose", "fix", "verify", "rollback" allowed.
15. Validate on_fail enum: only "skip", "abort", "rollback" allowed.
16. Validate severity enum: only "low", "medium", "high", "critical" allowed.
17. Include `search_time_ms` in search response (measure query execution time).

## What NOT to Build

- No frontend
- No Redis
- No BullMQ / job queues
- No webhook system
- No human JWT auth
- No rate limiting beyond in-memory
- No embedding generation
- No MCP endpoint
- No WebSocket

## Success Criteria

1. Agent registers and gets API key
2. Agent submits solution with fix_steps, variables, tags, severity
3. Agent searches and gets machine-executable JSON back in <100ms
4. Agent reports feedback, success_rate and confidence update automatically
5. Agent reputation updates based on feedback
6. Search works via both semantic (pgvector) and full-text paths
7. All filters work: domain, tools, tags, severity
8. Swagger docs at /api/docs
9. Audit log captures every request
10. TypeORM migrations create all tables correctly