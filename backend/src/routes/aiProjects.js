import { Router } from 'express';
import { pool } from '../db.js';
import { validateAiProjectInput } from '../validators.js';

const router = Router();

async function ensureEmployee(client, { employeeId, employeeName }) {
  if (employeeId) {
    const result = await client.query('SELECT id FROM employees WHERE id = $1', [Number(employeeId)]);
    if (!result.rowCount) {
      throw new Error('NOT_FOUND_EMPLOYEE');
    }
    return Number(employeeId);
  }

  const name = employeeName?.trim();
  if (!name) {
    throw new Error('INVALID_EMPLOYEE');
  }

  const existing = await client.query(
    `SELECT id FROM employees WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [name]
  );
  if (existing.rowCount) {
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `INSERT INTO employees (name)
     VALUES ($1)
     RETURNING id`,
    [name]
  );

  return inserted.rows[0].id;
}

function normalizeOptionalInt(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return Number(value);
}

function normalizeOptionalDate(value) {
  if (!value) {
    return null;
  }
  return value;
}

router.get('/', async (req, res, next) => {
  try {
    const { status, employeeId, receivedFrom, receivedTo } = req.query;

    const conditions = [];
    const values = [];

    if (status) {
      values.push(status);
      conditions.push(`p.status = $${values.length}`);
    }

    if (employeeId) {
      values.push(Number(employeeId));
      conditions.push(`p.employee_id = $${values.length}`);
    }

    if (receivedFrom) {
      values.push(receivedFrom);
      conditions.push(`p.received_date >= $${values.length}`);
    }

    if (receivedTo) {
      values.push(receivedTo);
      conditions.push(`p.received_date <= $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT p.id, p.received_date, p.proposer_name, p.description, p.status,
              p.estimated_days, p.actual_days, p.start_date, p.target_end_date,
              p.actual_end_date, p.employee_id, e.name AS employee_name,
              p.created_at, p.updated_at
       FROM ai_projects p
       JOIN employees e ON e.id = p.employee_id
       ${whereClause}
       ORDER BY p.received_date DESC, p.id DESC`,
      values
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const validation = validateAiProjectInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    await client.query('BEGIN');

    const employeeId = await ensureEmployee(client, {
      employeeId: req.body.employeeId,
      employeeName: req.body.employeeName
    });

    const result = await client.query(
      `INSERT INTO ai_projects (
        received_date, proposer_name, description, status,
        estimated_days, actual_days, start_date, target_end_date,
        actual_end_date, employee_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id`,
      [
        req.body.receivedDate,
        req.body.proposerName.trim(),
        req.body.description.trim(),
        req.body.status || 'Đề xuất',
        normalizeOptionalInt(req.body.estimatedDays),
        normalizeOptionalInt(req.body.actualDays),
        normalizeOptionalDate(req.body.startDate),
        normalizeOptionalDate(req.body.targetEndDate),
        normalizeOptionalDate(req.body.actualEndDate),
        employeeId
      ]
    );

    await client.query('COMMIT');

    const detail = await pool.query(
      `SELECT p.id, p.received_date, p.proposer_name, p.description, p.status,
              p.estimated_days, p.actual_days, p.start_date, p.target_end_date,
              p.actual_end_date, p.employee_id, e.name AS employee_name,
              p.created_at, p.updated_at
       FROM ai_projects p
       JOIN employees e ON e.id = p.employee_id
       WHERE p.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(detail.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.message === 'NOT_FOUND_EMPLOYEE') {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
    }

    if (error.message === 'INVALID_EMPLOYEE') {
      return res.status(400).json({ error: 'Nhân viên phụ trách không hợp lệ.' });
    }

    next(error);
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: 'ID dự án không hợp lệ.' });
    }

    const validation = validateAiProjectInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    await client.query('BEGIN');

    const employeeId = await ensureEmployee(client, {
      employeeId: req.body.employeeId,
      employeeName: req.body.employeeName
    });

    const updated = await client.query(
      `UPDATE ai_projects
       SET received_date = $1,
           proposer_name = $2,
           description = $3,
           status = $4,
           estimated_days = $5,
           actual_days = $6,
           start_date = $7,
           target_end_date = $8,
           actual_end_date = $9,
           employee_id = $10,
           updated_at = NOW()
       WHERE id = $11
       RETURNING id`,
      [
        req.body.receivedDate,
        req.body.proposerName.trim(),
        req.body.description.trim(),
        req.body.status || 'Đề xuất',
        normalizeOptionalInt(req.body.estimatedDays),
        normalizeOptionalInt(req.body.actualDays),
        normalizeOptionalDate(req.body.startDate),
        normalizeOptionalDate(req.body.targetEndDate),
        normalizeOptionalDate(req.body.actualEndDate),
        employeeId,
        projectId
      ]
    );

    if (!updated.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Không tìm thấy dự án AI.' });
    }

    await client.query('COMMIT');

    const detail = await pool.query(
      `SELECT p.id, p.received_date, p.proposer_name, p.description, p.status,
              p.estimated_days, p.actual_days, p.start_date, p.target_end_date,
              p.actual_end_date, p.employee_id, e.name AS employee_name,
              p.created_at, p.updated_at
       FROM ai_projects p
       JOIN employees e ON e.id = p.employee_id
       WHERE p.id = $1`,
      [projectId]
    );

    res.json(detail.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.message === 'NOT_FOUND_EMPLOYEE') {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
    }

    if (error.message === 'INVALID_EMPLOYEE') {
      return res.status(400).json({ error: 'Nhân viên phụ trách không hợp lệ.' });
    }

    next(error);
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: 'ID dự án không hợp lệ.' });
    }

    const result = await pool.query('DELETE FROM ai_projects WHERE id = $1', [projectId]);
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Không tìm thấy dự án AI.' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/summary', async (_req, res, next) => {
  try {
    const kpiResult = await pool.query(
      `SELECT
         COUNT(*) AS total_projects,
         COUNT(*) FILTER (WHERE status = 'Đang triển khai') AS in_progress_projects,
         COUNT(*) FILTER (WHERE status = 'Hoàn thành') AS completed_projects,
         COUNT(*) FILTER (WHERE status = 'Tạm dừng') AS paused_projects
       FROM ai_projects`
    );

    const statusResult = await pool.query(
      `SELECT status, COUNT(*)::INTEGER AS total
       FROM ai_projects
       GROUP BY status
       ORDER BY total DESC, status ASC`
    );

    const employeeResult = await pool.query(
      `SELECT e.name AS employee_name, COUNT(*)::INTEGER AS total
       FROM ai_projects p
       JOIN employees e ON e.id = p.employee_id
       GROUP BY e.id, e.name
       ORDER BY total DESC, e.name ASC`
    );

    res.json({
      kpi: {
        total: Number(kpiResult.rows[0].total_projects),
        inProgress: Number(kpiResult.rows[0].in_progress_projects),
        completed: Number(kpiResult.rows[0].completed_projects),
        paused: Number(kpiResult.rows[0].paused_projects)
      },
      byStatus: statusResult.rows,
      byEmployee: employeeResult.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
