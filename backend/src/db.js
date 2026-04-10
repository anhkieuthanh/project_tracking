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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_projects (
      id SERIAL PRIMARY KEY,
      received_date DATE NOT NULL,
      proposer_name VARCHAR(150) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'Đề xuất'
        CHECK (status IN ('Đề xuất', 'Đã duyệt', 'Đang triển khai', 'Hoàn thành', 'Tạm dừng')),
      estimated_days INTEGER,
      actual_days INTEGER,
      start_date DATE,
      target_end_date DATE,
      actual_end_date DATE,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (estimated_days IS NULL OR estimated_days >= 0),
      CHECK (actual_days IS NULL OR actual_days >= 0)
    );
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
