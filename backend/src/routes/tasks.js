import { Router } from 'express';
import { pool } from '../db.js';
import { validateTaskInput } from '../validators.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, title, completed_date, priority, status, category, note, created_at, updated_at
       FROM tasks
       ORDER BY COALESCE(completed_date, CURRENT_DATE) ASC, id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validation = validateTaskInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    const { title, completedDate = null, priority = 'Trung bình', status = 'Chưa làm', category, note = '' } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks (title, completed_date, priority, status, category, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, completed_date, priority, status, category, note, created_at, updated_at`,
      [title.trim(), completedDate, priority, status, category.trim(), note.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validation = validateTaskInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ error: 'ID không hợp lệ.' });
    }

    const { title, completedDate = null, priority = 'Trung bình', status = 'Chưa làm', category, note = '' } = req.body;

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1,
           completed_date = $2,
           priority = $3,
           status = $4,
           category = $5,
           note = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, title, completed_date, priority, status, category, note, created_at, updated_at`,
      [title.trim(), completedDate, priority, status, category.trim(), note.trim(), taskId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Không tìm thấy công việc.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ error: 'ID không hợp lệ.' });
    }

    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Không tìm thấy công việc.' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
