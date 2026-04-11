import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE,
      role VARCHAR(80) NOT NULL DEFAULT 'Thành viên',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS role VARCHAR(80) NOT NULL DEFAULT 'Thành viên'
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_initiatives (
      id SERIAL PRIMARY KEY,
      code VARCHAR(16) UNIQUE,
      title VARCHAR(255) NOT NULL,
      department VARCHAR(150) NOT NULL,
      proposer_name VARCHAR(150) NOT NULL,
      owner_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      requested_at DATE NOT NULL,
      target_deadline DATE,
      priority VARCHAR(20) NOT NULL DEFAULT 'Trung bình'
        CHECK (priority IN ('Cao', 'Trung bình', 'Thấp')),
      current_stage VARCHAR(20) NOT NULL DEFAULT 'request'
        CHECK (current_stage IN ('request', 'feasibility', 'design', 'delivery', 'approval', 'operations', 'no_go')),
      gate_decision VARCHAR(20)
        CHECK (gate_decision IS NULL OR gate_decision IN ('Go', 'Conditional Go', 'No-Go')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE ai_initiatives
    ADD COLUMN IF NOT EXISTS code VARCHAR(16)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS request_forms (
      initiative_id INTEGER PRIMARY KEY REFERENCES ai_initiatives(id) ON DELETE CASCADE,
      problem_statement TEXT NOT NULL,
      objective TEXT NOT NULL,
      success_kpi TEXT NOT NULL,
      end_users TEXT NOT NULL,
      usage_frequency TEXT NOT NULL,
      time_budget_constraints TEXT NOT NULL,
      available_data_status VARCHAR(20) NOT NULL
        CHECK (available_data_status IN ('Có', 'Không', 'Một phần')),
      available_data_details TEXT NOT NULL DEFAULT '',
      desired_deadline DATE,
      expected_completion_date DATE,
      budget_estimate TEXT NOT NULL DEFAULT '',
      pain_points TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE request_forms
    ADD COLUMN IF NOT EXISTS expected_completion_date DATE
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feasibility_reviews (
      initiative_id INTEGER PRIMARY KEY REFERENCES ai_initiatives(id) ON DELETE CASCADE,
      data_score INTEGER CHECK (data_score BETWEEN 1 AND 5),
      technical_score INTEGER CHECK (technical_score BETWEEN 1 AND 5),
      business_score INTEGER CHECK (business_score BETWEEN 1 AND 5),
      compliance_score INTEGER CHECK (compliance_score BETWEEN 1 AND 5),
      data_summary TEXT NOT NULL DEFAULT '',
      technical_summary TEXT NOT NULL DEFAULT '',
      business_summary TEXT NOT NULL DEFAULT '',
      compliance_summary TEXT NOT NULL DEFAULT '',
      decision VARCHAR(20)
        CHECK (decision IS NULL OR decision IN ('Go', 'Conditional Go', 'No-Go')),
      conditional_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      reviewed_by TEXT NOT NULL DEFAULT '',
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS solution_designs (
      initiative_id INTEGER PRIMARY KEY REFERENCES ai_initiatives(id) ON DELETE CASCADE,
      solution_option VARCHAR(20)
        CHECK (solution_option IS NULL OR solution_option IN ('Build', 'Buy', 'Fine-tune', 'RAG', 'API / Third-party')),
      architecture_summary TEXT NOT NULL DEFAULT '',
      integration_requirements TEXT NOT NULL DEFAULT '',
      security_requirements TEXT NOT NULL DEFAULT '',
      monitoring_plan TEXT NOT NULL DEFAULT '',
      milestone_plan TEXT NOT NULL DEFAULT '',
      staffing_plan TEXT NOT NULL DEFAULT '',
      risks_and_mitigations TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS delivery_cycles (
      initiative_id INTEGER PRIMARY KEY REFERENCES ai_initiatives(id) ON DELETE CASCADE,
      poc_status VARCHAR(20) NOT NULL DEFAULT 'Chưa bắt đầu'
        CHECK (poc_status IN ('Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng')),
      model_test_status VARCHAR(20) NOT NULL DEFAULT 'Chưa bắt đầu'
        CHECK (model_test_status IN ('Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng')),
      uat_status VARCHAR(20) NOT NULL DEFAULT 'Chưa bắt đầu'
        CHECK (uat_status IN ('Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng')),
      security_test_status VARCHAR(20) NOT NULL DEFAULT 'Chưa bắt đầu'
        CHECK (security_test_status IN ('Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng')),
      model_card_status VARCHAR(20) NOT NULL DEFAULT 'Chưa bắt đầu'
        CHECK (model_card_status IN ('Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng')),
      performance_metrics TEXT NOT NULL DEFAULT '',
      pilot_feedback TEXT NOT NULL DEFAULT '',
      delivery_notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS approval_records (
      initiative_id INTEGER PRIMARY KEY REFERENCES ai_initiatives(id) ON DELETE CASCADE,
      governance_approved BOOLEAN NOT NULL DEFAULT FALSE,
      tech_approved BOOLEAN NOT NULL DEFAULT FALSE,
      legal_approved BOOLEAN NOT NULL DEFAULT FALSE,
      business_approved BOOLEAN NOT NULL DEFAULT FALSE,
      checklist JSONB NOT NULL DEFAULT '{"performance":false,"security":false,"documentation":false,"rollback":false,"monitoring":false,"training":false,"sla":false,"budget":false,"incident":false}'::jsonb,
      ready_for_go_live BOOLEAN NOT NULL DEFAULT FALSE,
      approval_notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS operations_records (
      initiative_id INTEGER PRIMARY KEY REFERENCES ai_initiatives(id) ON DELETE CASCADE,
      rollout_strategy VARCHAR(20)
        CHECK (rollout_strategy IS NULL OR rollout_strategy IN ('Shadow Mode', 'Canary Release', 'Blue-Green', 'Feature Flag')),
      sla_slo TEXT NOT NULL DEFAULT '',
      alerting_setup TEXT NOT NULL DEFAULT '',
      kpi_impact TEXT NOT NULL DEFAULT '',
      incident_log TEXT NOT NULL DEFAULT '',
      continuous_improvement TEXT NOT NULL DEFAULT '',
      adoption_plan TEXT NOT NULL DEFAULT '',
      operational_notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS initiative_stage_history (
      id SERIAL PRIMARY KEY,
      initiative_id INTEGER NOT NULL REFERENCES ai_initiatives(id) ON DELETE CASCADE,
      stage VARCHAR(20) NOT NULL
        CHECK (stage IN ('request', 'feasibility', 'design', 'delivery', 'approval', 'operations', 'no_go')),
      changed_by TEXT NOT NULL DEFAULT 'system',
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`DROP TABLE IF EXISTS ai_projects CASCADE`);

  await pool.query(`
    UPDATE ai_initiatives
    SET code = CONCAT('HLAI', LPAD(id::text, 4, '0'))
    WHERE code IS NULL
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ai_initiatives_code_key ON ai_initiatives(code)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed_date DATE,
      priority VARCHAR(16) NOT NULL DEFAULT 'Trung bình' CHECK (priority IN ('Cao', 'Trung bình', 'Thấp')),
      status VARCHAR(32) NOT NULL DEFAULT 'Chưa làm' CHECK (status IN ('Chưa làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng')),
      category VARCHAR(100) NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id SERIAL PRIMARY KEY,
      week_label VARCHAR(64) NOT NULL,
      exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      total_tasks INTEGER NOT NULL,
      completed_tasks INTEGER NOT NULL,
      in_progress_tasks INTEGER NOT NULL,
      blocked_tasks INTEGER NOT NULL,
      todo_tasks INTEGER NOT NULL,
      high_priority_tasks INTEGER NOT NULL,
      medium_priority_tasks INTEGER NOT NULL,
      low_priority_tasks INTEGER NOT NULL,
      pdf_filename VARCHAR(255) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_history (
      id SERIAL PRIMARY KEY,
      report_id INTEGER NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed_date DATE,
      priority VARCHAR(16) NOT NULL,
      status VARCHAR(32) NOT NULL,
      category VARCHAR(100) NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
  `);

  // Migrate enum values from old English labels to Vietnamese labels.
  await pool.query(`
    UPDATE tasks
    SET priority = CASE priority
      WHEN 'High' THEN 'Cao'
      WHEN 'Medium' THEN 'Trung bình'
      WHEN 'Low' THEN 'Thấp'
      ELSE priority
    END
  `);

  await pool.query(`
    UPDATE tasks
    SET status = CASE status
      WHEN 'Todo' THEN 'Chưa làm'
      WHEN 'In Progress' THEN 'Đang làm'
      WHEN 'Done' THEN 'Hoàn thành'
      WHEN 'Blocked' THEN 'Tạm dừng'
      ELSE status
    END
  `);

  await pool.query(`
    UPDATE task_history
    SET priority = CASE priority
      WHEN 'High' THEN 'Cao'
      WHEN 'Medium' THEN 'Trung bình'
      WHEN 'Low' THEN 'Thấp'
      ELSE priority
    END
  `);

  await pool.query(`
    UPDATE task_history
    SET status = CASE status
      WHEN 'Todo' THEN 'Chưa làm'
      WHEN 'In Progress' THEN 'Đang làm'
      WHEN 'Done' THEN 'Hoàn thành'
      WHEN 'Blocked' THEN 'Tạm dừng'
      ELSE status
    END
  `);

  await pool.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check`);
  await pool.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check`);

  await pool.query(`
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_priority_check
    CHECK (priority IN ('Cao', 'Trung bình', 'Thấp'))
  `);

  await pool.query(`
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_status_check
    CHECK (status IN ('Chưa làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'))
  `);

  await pool.query(`ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'Trung bình'`);
  await pool.query(`ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'Chưa làm'`);
}
