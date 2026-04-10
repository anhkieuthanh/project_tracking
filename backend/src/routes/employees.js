import { Router } from 'express';
import { pool } from '../db.js';
import { validateEmployeeInput } from '../validators.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, created_at, updated_at
       FROM employees
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validation = validateEmployeeInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ errors: validation.errors });
    }

    const name = req.body.name.trim();
    const existing = await pool.query(
      `SELECT id, name, created_at, updated_at
       FROM employees
       WHERE LOWER(name) = LOWER($1)
       LIMIT 1`,
      [name]
    );

    if (existing.rowCount) {
      return res.json(existing.rows[0]);
    }

    const inserted = await pool.query(
      `INSERT INTO employees (name)
       VALUES ($1)
       RETURNING id, name, created_at, updated_at`,
      [name]
    );

    res.status(201).json(inserted.rows[0]);
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Nhân viên đã tồn tại.' });
    }
    next(error);
  }
});

export default router;
