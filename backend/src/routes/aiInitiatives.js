import { Router } from 'express';
import { pool } from '../db.js';
import {
  validateApprovalInput,
  validateDeliveryInput,
  validateFeasibilityInput,
  validateGateReviewInput,
  validateOperationsInput,
  validateRequestFormInput,
  validateSolutionDesignInput
} from '../validators.js';

const router = Router();

const DEFAULT_CHECKLIST = {
  performance: false,
  security: false,
  documentation: false,
  rollback: false,
  monitoring: false,
  training: false,
  sla: false,
  budget: false,
  incident: false
};

function normalizeOptionalDate(value) {
  return value ? value : null;
}

function normalizeConditionalItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item).trim()).filter(Boolean);
}

async function ensureEmployee(client, { employeeId, employeeName, employeeRole }) {
  if (employeeId) {
    const result = await client.query(
      'SELECT id, name, role FROM employees WHERE id = $1',
      [Number(employeeId)]
    );
    if (!result.rowCount) {
      throw new Error('NOT_FOUND_EMPLOYEE');
    }
    return result.rows[0];
  }

  const name = employeeName?.trim();
  if (!name) {
    throw new Error('INVALID_EMPLOYEE');
  }

  const existing = await client.query(
    `SELECT id, name, role FROM employees WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [name]
  );
  if (existing.rowCount) {
    return existing.rows[0];
  }

  const inserted = await client.query(
    `INSERT INTO employees (name, role)
     VALUES ($1, $2)
     RETURNING id, name, role`,
    [name, employeeRole?.trim() || 'AI Project Manager']
  );
  return inserted.rows[0];
}

function stageLabel(stage) {
  const labels = {
    request: 'Yêu cầu AI',
    feasibility: 'Đánh giá khả thi',
    design: 'Thiết kế giải pháp',
    delivery: 'Triển khai & thử nghiệm',
    approval: 'Phê duyệt',
    operations: 'Vận hành',
    no_go: 'No-Go'
  };
  return labels[stage] || stage;
}

function gateToStage(decision) {
  if (decision === 'Go') return 'design';
  if (decision === 'Conditional Go') return 'feasibility';
  return 'no_go';
}

async function getInitiativeBase(client, initiativeId) {
  const result = await client.query(
    `SELECT i.id, i.title, i.department, i.proposer_name, i.owner_employee_id,
            i.requested_at, i.target_deadline, i.priority, i.current_stage, i.gate_decision,
            i.created_at, i.updated_at, e.name AS owner_name, e.role AS owner_role
     FROM ai_initiatives i
     LEFT JOIN employees e ON e.id = i.owner_employee_id
     WHERE i.id = $1`,
    [initiativeId]
  );

  if (!result.rowCount) {
    return null;
  }
  return result.rows[0];
}

async function getInitiativeDetail(client, initiativeId) {
  const initiative = await getInitiativeBase(client, initiativeId);
  if (!initiative) {
    return null;
  }

  const requestForm = await client.query('SELECT * FROM request_forms WHERE initiative_id = $1', [
    initiativeId
  ]);
  const feasibility = await client.query(
    'SELECT * FROM feasibility_reviews WHERE initiative_id = $1',
    [initiativeId]
  );
  const solutionDesign = await client.query(
    'SELECT * FROM solution_designs WHERE initiative_id = $1',
    [initiativeId]
  );
  const delivery = await client.query('SELECT * FROM delivery_cycles WHERE initiative_id = $1', [
    initiativeId
  ]);
  const approvals = await client.query(
    'SELECT * FROM approval_records WHERE initiative_id = $1',
    [initiativeId]
  );
  const operations = await client.query(
    'SELECT * FROM operations_records WHERE initiative_id = $1',
    [initiativeId]
  );
  const history = await client.query(
    `SELECT id, stage, changed_by, note, created_at
     FROM initiative_stage_history
     WHERE initiative_id = $1
     ORDER BY created_at ASC, id ASC`,
    [initiativeId]
  );

  return {
    ...initiative,
    stage_label: stageLabel(initiative.current_stage),
    requestForm: requestForm.rows[0] || null,
    feasibility: feasibility.rows[0] || null,
    solutionDesign: solutionDesign.rows[0] || null,
    delivery: delivery.rows[0] || null,
    approvals: approvals.rows[0] || null,
    operations: operations.rows[0] || null,
    stageHistory: history.rows
  };
}

async function requireInitiative(client, initiativeId) {
  const initiative = await getInitiativeBase(client, initiativeId);
  if (!initiative) {
    throw new Error('NOT_FOUND_INITIATIVE');
  }
  return initiative;
}

async function appendHistory(client, initiativeId, stage, changedBy, note) {
  await client.query(
    `INSERT INTO initiative_stage_history (initiative_id, stage, changed_by, note)
     VALUES ($1, $2, $3, $4)`,
    [initiativeId, stage, changedBy || 'system', note || '']
  );
}

async function updateStage(client, initiativeId, stage, note, changedBy = 'system') {
  await client.query(
    `UPDATE ai_initiatives
     SET current_stage = $1, updated_at = NOW()
     WHERE id = $2`,
    [stage, initiativeId]
  );
  await appendHistory(client, initiativeId, stage, changedBy, note);
}

function assertCanProceed(initiative, stages) {
  if (initiative.current_stage === 'no_go') {
    throw new Error('NO_GO_LOCKED');
  }
  if (!stages.includes(initiative.current_stage)) {
    throw new Error('INVALID_STAGE_TRANSITION');
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { stage, priority, ownerEmployeeId, gateDecision, requestedFrom, requestedTo } = req.query;
    const values = [];
    const conditions = [];

    if (stage) {
      values.push(stage);
      conditions.push(`i.current_stage = $${values.length}`);
    }
    if (priority) {
      values.push(priority);
      conditions.push(`i.priority = $${values.length}`);
    }
    if (ownerEmployeeId) {
      values.push(Number(ownerEmployeeId));
      conditions.push(`i.owner_employee_id = $${values.length}`);
    }
    if (gateDecision) {
      values.push(gateDecision);
      conditions.push(`i.gate_decision = $${values.length}`);
    }
    if (requestedFrom) {
      values.push(requestedFrom);
      conditions.push(`i.requested_at >= $${values.length}`);
    }
    if (requestedTo) {
      values.push(requestedTo);
      conditions.push(`i.requested_at <= $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT i.id, i.title, i.department, i.proposer_name, i.owner_employee_id,
              i.requested_at, i.target_deadline, i.priority, i.current_stage, i.gate_decision,
              i.created_at, i.updated_at, e.name AS owner_name, e.role AS owner_role,
              a.ready_for_go_live,
              o.rollout_strategy
       FROM ai_initiatives i
       LEFT JOIN employees e ON e.id = i.owner_employee_id
       LEFT JOIN approval_records a ON a.initiative_id = i.id
       LEFT JOIN operations_records o ON o.initiative_id = i.id
       ${whereClause}
       ORDER BY i.requested_at DESC, i.id DESC`,
      values
    );

    res.json(
      result.rows.map((row) => ({
        ...row,
        stage_label: stageLabel(row.current_stage)
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const validation = validateRequestFormInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    await client.query('BEGIN');
    const owner = await ensureEmployee(client, {
      employeeId: req.body.ownerEmployeeId,
      employeeName: req.body.ownerEmployeeName,
      employeeRole: req.body.ownerEmployeeRole
    });

    const initiativeInsert = await client.query(
      `INSERT INTO ai_initiatives (
         title, department, proposer_name, owner_employee_id,
         requested_at, target_deadline, priority, current_stage
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'request')
       RETURNING id`,
      [
        req.body.title.trim(),
        req.body.department.trim(),
        req.body.proposerName.trim(),
        owner.id,
        req.body.requestedAt,
        normalizeOptionalDate(req.body.targetDeadline),
        req.body.priority
      ]
    );

    const initiativeId = initiativeInsert.rows[0].id;

    await client.query(
      `INSERT INTO request_forms (
         initiative_id, problem_statement, objective, success_kpi, end_users,
         usage_frequency, time_budget_constraints, available_data_status,
         available_data_details, desired_deadline, budget_estimate, pain_points, notes
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        initiativeId,
        req.body.problemStatement.trim(),
        req.body.objective.trim(),
        req.body.successKpi.trim(),
        req.body.endUsers.trim(),
        req.body.usageFrequency.trim(),
        req.body.timeBudgetConstraints.trim(),
        req.body.availableDataStatus,
        req.body.availableDataDetails?.trim() || '',
        normalizeOptionalDate(req.body.desiredDeadline),
        req.body.budgetEstimate?.trim() || '',
        req.body.painPoints?.trim() || '',
        req.body.notes?.trim() || ''
      ]
    );

    await appendHistory(client, initiativeId, 'request', req.body.updatedBy || 'system', 'Tạo hồ sơ AI mới');
    await client.query('COMMIT');

    const detail = await getInitiativeDetail(client, initiativeId);
    res.status(201).json(detail);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'NOT_FOUND_EMPLOYEE') {
      return res.status(404).json({ error: 'Không tìm thấy người phụ trách.' });
    }
    if (error.message === 'INVALID_EMPLOYEE') {
      return res.status(400).json({ error: 'Người phụ trách không hợp lệ.' });
    }
    next(error);
  } finally {
    client.release();
  }
});

router.get('/dashboard/summary', async (_req, res, next) => {
  try {
    const [stages, decisions, approvals, deadlines, owners] = await Promise.all([
      pool.query(
        `SELECT current_stage, COUNT(*)::int AS total
         FROM ai_initiatives
         GROUP BY current_stage
         ORDER BY current_stage`
      ),
      pool.query(
        `SELECT COALESCE(gate_decision, 'Chưa review') AS gate_decision, COUNT(*)::int AS total
         FROM ai_initiatives
         GROUP BY COALESCE(gate_decision, 'Chưa review')
         ORDER BY gate_decision`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS backlog
         FROM ai_initiatives i
         LEFT JOIN approval_records a ON a.initiative_id = i.id
         WHERE i.current_stage = 'approval'
           AND (
             a.initiative_id IS NULL OR
             a.ready_for_go_live = FALSE
           )`
      ),
      pool.query(
        `SELECT id, title, target_deadline, current_stage
         FROM ai_initiatives
         WHERE target_deadline IS NOT NULL
           AND current_stage <> 'operations'
           AND current_stage <> 'no_go'
           AND target_deadline <= CURRENT_DATE + INTERVAL '14 days'
         ORDER BY target_deadline ASC, id ASC`
      ),
      pool.query(
        `SELECT COALESCE(e.name, 'Chưa phân công') AS owner_name, COUNT(*)::int AS total
         FROM ai_initiatives i
         LEFT JOIN employees e ON e.id = i.owner_employee_id
         GROUP BY COALESCE(e.name, 'Chưa phân công')
         ORDER BY total DESC, owner_name ASC`
      )
    ]);

    res.json({
      totals: {
        initiatives: stages.rows.reduce((sum, row) => sum + row.total, 0),
        approvalBacklog: approvals.rows[0]?.backlog || 0,
        nearingDeadline: deadlines.rows.length
      },
      byStage: stages.rows.map((row) => ({
        stage: row.current_stage,
        label: stageLabel(row.current_stage),
        total: row.total
      })),
      byDecision: decisions.rows,
      byOwner: owners.rows,
      nearingDeadline: deadlines.rows
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const initiativeId = Number(req.params.id);
    if (Number.isNaN(initiativeId)) {
      return res.status(400).json({ error: 'ID hồ sơ không hợp lệ.' });
    }

    const detail = await getInitiativeDetail(pool, initiativeId);
    if (!detail) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    res.json(detail);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const initiativeId = Number(req.params.id);
    if (Number.isNaN(initiativeId)) {
      return res.status(400).json({ error: 'ID hồ sơ không hợp lệ.' });
    }

    const validation = validateRequestFormInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    await client.query('BEGIN');
    await requireInitiative(client, initiativeId);
    const owner = await ensureEmployee(client, {
      employeeId: req.body.ownerEmployeeId,
      employeeName: req.body.ownerEmployeeName,
      employeeRole: req.body.ownerEmployeeRole
    });

    await client.query(
      `UPDATE ai_initiatives
       SET title = $1,
           department = $2,
           proposer_name = $3,
           owner_employee_id = $4,
           requested_at = $5,
           target_deadline = $6,
           priority = $7,
           updated_at = NOW()
       WHERE id = $8`,
      [
        req.body.title.trim(),
        req.body.department.trim(),
        req.body.proposerName.trim(),
        owner.id,
        req.body.requestedAt,
        normalizeOptionalDate(req.body.targetDeadline),
        req.body.priority,
        initiativeId
      ]
    );

    await client.query(
      `UPDATE request_forms
       SET problem_statement = $1,
           objective = $2,
           success_kpi = $3,
           end_users = $4,
           usage_frequency = $5,
           time_budget_constraints = $6,
           available_data_status = $7,
           available_data_details = $8,
           desired_deadline = $9,
           budget_estimate = $10,
           pain_points = $11,
           notes = $12,
           updated_at = NOW()
       WHERE initiative_id = $13`,
      [
        req.body.problemStatement.trim(),
        req.body.objective.trim(),
        req.body.successKpi.trim(),
        req.body.endUsers.trim(),
        req.body.usageFrequency.trim(),
        req.body.timeBudgetConstraints.trim(),
        req.body.availableDataStatus,
        req.body.availableDataDetails?.trim() || '',
        normalizeOptionalDate(req.body.desiredDeadline),
        req.body.budgetEstimate?.trim() || '',
        req.body.painPoints?.trim() || '',
        req.body.notes?.trim() || '',
        initiativeId
      ]
    );

    await client.query('COMMIT');
    const detail = await getInitiativeDetail(client, initiativeId);
    res.json(detail);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'NOT_FOUND_INITIATIVE') {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    if (error.message === 'NOT_FOUND_EMPLOYEE') {
      return res.status(404).json({ error: 'Không tìm thấy người phụ trách.' });
    }
    if (error.message === 'INVALID_EMPLOYEE') {
      return res.status(400).json({ error: 'Người phụ trách không hợp lệ.' });
    }
    next(error);
  } finally {
    client.release();
  }
});

router.get('/:id/request-form', async (req, res, next) => {
  try {
    const initiativeId = Number(req.params.id);
    const detail = await getInitiativeDetail(pool, initiativeId);
    if (!detail) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    res.json({
      initiative: {
        id: detail.id,
        title: detail.title,
        department: detail.department,
        proposer_name: detail.proposer_name,
        owner_employee_id: detail.owner_employee_id,
        owner_name: detail.owner_name,
        owner_role: detail.owner_role,
        requested_at: detail.requested_at,
        target_deadline: detail.target_deadline,
        priority: detail.priority,
        current_stage: detail.current_stage,
        gate_decision: detail.gate_decision
      },
      requestForm: detail.requestForm
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/request-form', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const initiativeId = Number(req.params.id);
    if (Number.isNaN(initiativeId)) {
      return res.status(400).json({ error: 'ID hồ sơ không hợp lệ.' });
    }

    const validation = validateRequestFormInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    await client.query('BEGIN');
    await requireInitiative(client, initiativeId);
    const owner = await ensureEmployee(client, {
      employeeId: req.body.ownerEmployeeId,
      employeeName: req.body.ownerEmployeeName,
      employeeRole: req.body.ownerEmployeeRole
    });

    await client.query(
      `UPDATE ai_initiatives
       SET title = $1,
           department = $2,
           proposer_name = $3,
           owner_employee_id = $4,
           requested_at = $5,
           target_deadline = $6,
           priority = $7,
           updated_at = NOW()
       WHERE id = $8`,
      [
        req.body.title.trim(),
        req.body.department.trim(),
        req.body.proposerName.trim(),
        owner.id,
        req.body.requestedAt,
        normalizeOptionalDate(req.body.targetDeadline),
        req.body.priority,
        initiativeId
      ]
    );

    await client.query(
      `UPDATE request_forms
       SET problem_statement = $1,
           objective = $2,
           success_kpi = $3,
           end_users = $4,
           usage_frequency = $5,
           time_budget_constraints = $6,
           available_data_status = $7,
           available_data_details = $8,
           desired_deadline = $9,
           budget_estimate = $10,
           pain_points = $11,
           notes = $12,
           updated_at = NOW()
       WHERE initiative_id = $13`,
      [
        req.body.problemStatement.trim(),
        req.body.objective.trim(),
        req.body.successKpi.trim(),
        req.body.endUsers.trim(),
        req.body.usageFrequency.trim(),
        req.body.timeBudgetConstraints.trim(),
        req.body.availableDataStatus,
        req.body.availableDataDetails?.trim() || '',
        normalizeOptionalDate(req.body.desiredDeadline),
        req.body.budgetEstimate?.trim() || '',
        req.body.painPoints?.trim() || '',
        req.body.notes?.trim() || '',
        initiativeId
      ]
    );

    await client.query('COMMIT');
    const detail = await getInitiativeDetail(client, initiativeId);
    res.json({
      initiative: {
        id: detail.id,
        title: detail.title,
        department: detail.department,
        proposer_name: detail.proposer_name,
        owner_employee_id: detail.owner_employee_id,
        owner_name: detail.owner_name,
        owner_role: detail.owner_role,
        requested_at: detail.requested_at,
        target_deadline: detail.target_deadline,
        priority: detail.priority,
        current_stage: detail.current_stage,
        gate_decision: detail.gate_decision
      },
      requestForm: detail.requestForm
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'NOT_FOUND_INITIATIVE') {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    if (error.message === 'NOT_FOUND_EMPLOYEE') {
      return res.status(404).json({ error: 'Không tìm thấy người phụ trách.' });
    }
    if (error.message === 'INVALID_EMPLOYEE') {
      return res.status(400).json({ error: 'Người phụ trách không hợp lệ.' });
    }
    next(error);
  } finally {
    client.release();
  }
});

router.get('/:id/feasibility', async (req, res, next) => {
  try {
    const initiativeId = Number(req.params.id);
    const detail = await getInitiativeDetail(pool, initiativeId);
    if (!detail) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    res.json(detail.feasibility);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/feasibility', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const initiativeId = Number(req.params.id);
    if (Number.isNaN(initiativeId)) {
      return res.status(400).json({ error: 'ID hồ sơ không hợp lệ.' });
    }

    const validation = validateFeasibilityInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    await client.query('BEGIN');
    const initiative = await requireInitiative(client, initiativeId);
    assertCanProceed(initiative, ['request', 'feasibility', 'design', 'delivery', 'approval', 'operations']);

    await client.query(
      `INSERT INTO feasibility_reviews (
         initiative_id, data_score, technical_score, business_score, compliance_score,
         data_summary, technical_summary, business_summary, compliance_summary,
         reviewed_by, reviewed_at, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
       ON CONFLICT (initiative_id) DO UPDATE
       SET data_score = EXCLUDED.data_score,
           technical_score = EXCLUDED.technical_score,
           business_score = EXCLUDED.business_score,
           compliance_score = EXCLUDED.compliance_score,
           data_summary = EXCLUDED.data_summary,
           technical_summary = EXCLUDED.technical_summary,
           business_summary = EXCLUDED.business_summary,
           compliance_summary = EXCLUDED.compliance_summary,
           reviewed_by = EXCLUDED.reviewed_by,
           reviewed_at = NOW(),
           updated_at = NOW()`,
      [
        initiativeId,
        Number(req.body.dataScore),
        Number(req.body.technicalScore),
        Number(req.body.businessScore),
        Number(req.body.complianceScore),
        req.body.dataSummary.trim(),
        req.body.technicalSummary.trim(),
        req.body.businessSummary.trim(),
        req.body.complianceSummary.trim(),
        req.body.reviewedBy?.trim() || 'system'
      ]
    );

    if (initiative.current_stage === 'request') {
      await updateStage(
        client,
        initiativeId,
        'feasibility',
        'Bắt đầu đánh giá khả thi',
        req.body.reviewedBy || 'system'
      );
    }

    await client.query('COMMIT');
    const detail = await getInitiativeDetail(client, initiativeId);
    res.json(detail.feasibility);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'NOT_FOUND_INITIATIVE') {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    if (error.message === 'NO_GO_LOCKED') {
      return res.status(409).json({ error: 'Hồ sơ đã bị khóa ở trạng thái No-Go.' });
    }
    next(error);
  } finally {
    client.release();
  }
});

router.post('/:id/gate-review', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const initiativeId = Number(req.params.id);
    if (Number.isNaN(initiativeId)) {
      return res.status(400).json({ error: 'ID hồ sơ không hợp lệ.' });
    }

    const validation = validateGateReviewInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    await client.query('BEGIN');
    const initiative = await requireInitiative(client, initiativeId);
    const feasibility = await client.query(
      'SELECT * FROM feasibility_reviews WHERE initiative_id = $1',
      [initiativeId]
    );
    if (!feasibility.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cần hoàn tất đánh giá khả thi trước gate review.' });
    }

    const decision = req.body.decision;
    const conditionalItems = normalizeConditionalItems(req.body.conditionalItems);

    await client.query(
      `UPDATE feasibility_reviews
       SET decision = $1,
           conditional_items = $2::jsonb,
           reviewed_by = $3,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE initiative_id = $4`,
      [
        decision,
        JSON.stringify(conditionalItems),
        req.body.reviewedBy?.trim() || 'system',
        initiativeId
      ]
    );

    await client.query(
      `UPDATE ai_initiatives
       SET gate_decision = $1, updated_at = NOW()
       WHERE id = $2`,
      [decision, initiativeId]
    );

    await updateStage(
      client,
      initiativeId,
      gateToStage(decision),
      `Gate review: ${decision}${conditionalItems.length ? ` - ${conditionalItems.join('; ')}` : ''}`,
      req.body.reviewedBy || 'system'
    );

    await client.query('COMMIT');
    const detail = await getInitiativeDetail(client, initiativeId);
    res.json({
      gateDecision: detail.gate_decision,
      currentStage: detail.current_stage,
      feasibility: detail.feasibility
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'NOT_FOUND_INITIATIVE') {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    next(error);
  } finally {
    client.release();
  }
});

router.get('/:id/solution-design', async (req, res, next) => {
  try {
    const initiativeId = Number(req.params.id);
    const detail = await getInitiativeDetail(pool, initiativeId);
    if (!detail) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    res.json(detail.solutionDesign);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/solution-design', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const initiativeId = Number(req.params.id);
    if (Number.isNaN(initiativeId)) {
      return res.status(400).json({ error: 'ID hồ sơ không hợp lệ.' });
    }

    const validation = validateSolutionDesignInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    await client.query('BEGIN');
    const initiative = await requireInitiative(client, initiativeId);
    if (initiative.current_stage === 'no_go' || initiative.gate_decision === 'No-Go') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Hồ sơ đã bị khóa ở trạng thái No-Go.' });
    }
    if (!initiative.gate_decision || !['Go', 'Conditional Go'].includes(initiative.gate_decision)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cần gate review hợp lệ trước khi thiết kế giải pháp.' });
    }
    assertCanProceed(initiative, ['design', 'delivery', 'approval', 'operations', 'feasibility']);

    const feasibility = await client.query(
      'SELECT conditional_items FROM feasibility_reviews WHERE initiative_id = $1',
      [initiativeId]
    );
    if (
      initiative.gate_decision === 'Conditional Go' &&
      feasibility.rows[0]?.conditional_items?.length
    ) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Conditional Go còn điều kiện chưa được xử lý.' });
    }

    await client.query(
      `INSERT INTO solution_designs (
         initiative_id, solution_option, architecture_summary, integration_requirements,
         security_requirements, monitoring_plan, milestone_plan, staffing_plan, risks_and_mitigations
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (initiative_id) DO UPDATE
       SET solution_option = EXCLUDED.solution_option,
           architecture_summary = EXCLUDED.architecture_summary,
           integration_requirements = EXCLUDED.integration_requirements,
           security_requirements = EXCLUDED.security_requirements,
           monitoring_plan = EXCLUDED.monitoring_plan,
           milestone_plan = EXCLUDED.milestone_plan,
           staffing_plan = EXCLUDED.staffing_plan,
           risks_and_mitigations = EXCLUDED.risks_and_mitigations,
           updated_at = NOW()`,
      [
        initiativeId,
        req.body.solutionOption,
        req.body.architectureSummary.trim(),
        req.body.integrationRequirements.trim(),
        req.body.securityRequirements.trim(),
        req.body.monitoringPlan.trim(),
        req.body.milestonePlan.trim(),
        req.body.staffingPlan?.trim() || '',
        req.body.risksAndMitigations?.trim() || ''
      ]
    );

    await updateStage(
      client,
      initiativeId,
      'design',
      'Cập nhật thiết kế giải pháp',
      req.body.updatedBy || 'system'
    );

    await client.query('COMMIT');
    const detail = await getInitiativeDetail(client, initiativeId);
    res.json(detail.solutionDesign);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'NOT_FOUND_INITIATIVE') {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    if (error.message === 'NO_GO_LOCKED') {
      return res.status(409).json({ error: 'Hồ sơ đã bị khóa ở trạng thái No-Go.' });
    }
    next(error);
  } finally {
    client.release();
  }
});

router.get('/:id/delivery', async (req, res, next) => {
  try {
    const initiativeId = Number(req.params.id);
    const detail = await getInitiativeDetail(pool, initiativeId);
    if (!detail) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    res.json(detail.delivery);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/delivery', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const initiativeId = Number(req.params.id);
    if (Number.isNaN(initiativeId)) {
      return res.status(400).json({ error: 'ID hồ sơ không hợp lệ.' });
    }

    const validation = validateDeliveryInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    await client.query('BEGIN');
    const initiative = await requireInitiative(client, initiativeId);
    if (initiative.current_stage === 'no_go' || initiative.gate_decision === 'No-Go') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Hồ sơ đã bị khóa ở trạng thái No-Go.' });
    }
    if (!initiative.gate_decision || !['Go', 'Conditional Go'].includes(initiative.gate_decision)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cần gate review hợp lệ trước khi triển khai.' });
    }

    const design = await client.query(
      'SELECT initiative_id FROM solution_designs WHERE initiative_id = $1',
      [initiativeId]
    );
    if (!design.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cần hoàn tất thiết kế giải pháp trước khi triển khai.' });
    }

    await client.query(
      `INSERT INTO delivery_cycles (
         initiative_id, poc_status, model_test_status, uat_status,
         security_test_status, model_card_status, performance_metrics,
         pilot_feedback, delivery_notes
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (initiative_id) DO UPDATE
       SET poc_status = EXCLUDED.poc_status,
           model_test_status = EXCLUDED.model_test_status,
           uat_status = EXCLUDED.uat_status,
           security_test_status = EXCLUDED.security_test_status,
           model_card_status = EXCLUDED.model_card_status,
           performance_metrics = EXCLUDED.performance_metrics,
           pilot_feedback = EXCLUDED.pilot_feedback,
           delivery_notes = EXCLUDED.delivery_notes,
           updated_at = NOW()`,
      [
        initiativeId,
        req.body.pocStatus,
        req.body.modelTestStatus,
        req.body.uatStatus,
        req.body.securityTestStatus,
        req.body.modelCardStatus,
        req.body.performanceMetrics?.trim() || '',
        req.body.pilotFeedback?.trim() || '',
        req.body.deliveryNotes?.trim() || ''
      ]
    );

    await updateStage(
      client,
      initiativeId,
      'delivery',
      'Cập nhật trạng thái triển khai và thử nghiệm',
      req.body.updatedBy || 'system'
    );

    await client.query('COMMIT');
    const detail = await getInitiativeDetail(client, initiativeId);
    res.json(detail.delivery);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'NOT_FOUND_INITIATIVE') {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    next(error);
  } finally {
    client.release();
  }
});

router.get('/:id/approvals', async (req, res, next) => {
  try {
    const initiativeId = Number(req.params.id);
    const detail = await getInitiativeDetail(pool, initiativeId);
    if (!detail) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    res.json(detail.approvals);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/approvals', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const initiativeId = Number(req.params.id);
    if (Number.isNaN(initiativeId)) {
      return res.status(400).json({ error: 'ID hồ sơ không hợp lệ.' });
    }

    const validation = validateApprovalInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    await client.query('BEGIN');
    await requireInitiative(client, initiativeId);

    const delivery = await client.query(
      'SELECT * FROM delivery_cycles WHERE initiative_id = $1',
      [initiativeId]
    );
    if (!delivery.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cần hoàn tất delivery trước khi phê duyệt.' });
    }

    const allDeliveryDone = [
      delivery.rows[0].poc_status,
      delivery.rows[0].model_test_status,
      delivery.rows[0].uat_status,
      delivery.rows[0].security_test_status,
      delivery.rows[0].model_card_status
    ].every((status) => status === 'Hoàn thành');

    if (!allDeliveryDone) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Tất cả hạng mục delivery phải hoàn thành trước phê duyệt.' });
    }

    const checklist = { ...DEFAULT_CHECKLIST, ...req.body.checklist };
    const allApprovals =
      req.body.governanceApproved &&
      req.body.techApproved &&
      req.body.legalApproved &&
      req.body.businessApproved;
    const allChecklistDone = Object.values(checklist).every(Boolean);

    if (req.body.readyForGoLive && (!allApprovals || !allChecklistDone)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Chỉ được Ready for Go-Live khi đủ 4 phê duyệt và hoàn tất toàn bộ checklist.'
      });
    }

    await client.query(
      `INSERT INTO approval_records (
         initiative_id, governance_approved, tech_approved, legal_approved,
         business_approved, checklist, ready_for_go_live, approval_notes
       )
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
       ON CONFLICT (initiative_id) DO UPDATE
       SET governance_approved = EXCLUDED.governance_approved,
           tech_approved = EXCLUDED.tech_approved,
           legal_approved = EXCLUDED.legal_approved,
           business_approved = EXCLUDED.business_approved,
           checklist = EXCLUDED.checklist,
           ready_for_go_live = EXCLUDED.ready_for_go_live,
           approval_notes = EXCLUDED.approval_notes,
           updated_at = NOW()`,
      [
        initiativeId,
        req.body.governanceApproved,
        req.body.techApproved,
        req.body.legalApproved,
        req.body.businessApproved,
        JSON.stringify(checklist),
        req.body.readyForGoLive,
        req.body.approvalNotes?.trim() || ''
      ]
    );

    await updateStage(
      client,
      initiativeId,
      req.body.readyForGoLive ? 'approval' : 'approval',
      req.body.readyForGoLive ? 'Đã sẵn sàng Go-Live' : 'Cập nhật phê duyệt',
      req.body.updatedBy || 'system'
    );

    await client.query('COMMIT');
    const detail = await getInitiativeDetail(client, initiativeId);
    res.json(detail.approvals);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'NOT_FOUND_INITIATIVE') {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    next(error);
  } finally {
    client.release();
  }
});

router.get('/:id/operations', async (req, res, next) => {
  try {
    const initiativeId = Number(req.params.id);
    const detail = await getInitiativeDetail(pool, initiativeId);
    if (!detail) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    res.json(detail.operations);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/operations', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const initiativeId = Number(req.params.id);
    if (Number.isNaN(initiativeId)) {
      return res.status(400).json({ error: 'ID hồ sơ không hợp lệ.' });
    }

    const validation = validateOperationsInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    await client.query('BEGIN');
    await requireInitiative(client, initiativeId);

    const approvals = await client.query(
      'SELECT ready_for_go_live FROM approval_records WHERE initiative_id = $1',
      [initiativeId]
    );
    if (!approvals.rowCount || !approvals.rows[0].ready_for_go_live) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cần Ready for Go-Live trước khi ghi nhận vận hành.' });
    }

    await client.query(
      `INSERT INTO operations_records (
         initiative_id, rollout_strategy, sla_slo, alerting_setup, kpi_impact,
         incident_log, continuous_improvement, adoption_plan, operational_notes
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (initiative_id) DO UPDATE
       SET rollout_strategy = EXCLUDED.rollout_strategy,
           sla_slo = EXCLUDED.sla_slo,
           alerting_setup = EXCLUDED.alerting_setup,
           kpi_impact = EXCLUDED.kpi_impact,
           incident_log = EXCLUDED.incident_log,
           continuous_improvement = EXCLUDED.continuous_improvement,
           adoption_plan = EXCLUDED.adoption_plan,
           operational_notes = EXCLUDED.operational_notes,
           updated_at = NOW()`,
      [
        initiativeId,
        req.body.rolloutStrategy,
        req.body.slaSlo.trim(),
        req.body.alertingSetup.trim(),
        req.body.kpiImpact.trim(),
        req.body.incidentLog?.trim() || '',
        req.body.continuousImprovement.trim(),
        req.body.adoptionPlan?.trim() || '',
        req.body.operationalNotes?.trim() || ''
      ]
    );

    await updateStage(
      client,
      initiativeId,
      'operations',
      'Ghi nhận rollout và vận hành',
      req.body.updatedBy || 'system'
    );

    await client.query('COMMIT');
    const detail = await getInitiativeDetail(client, initiativeId);
    res.json(detail.operations);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'NOT_FOUND_INITIATIVE') {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ AI.' });
    }
    next(error);
  } finally {
    client.release();
  }
});

export default router;
