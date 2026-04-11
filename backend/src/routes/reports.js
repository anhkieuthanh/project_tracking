import { Router } from 'express';
import path from 'path';
import { pool } from '../db.js';
import { createPdfReport } from '../services/pdfService.js';

const router = Router();

function getWeekLabel(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = new Intl.DateTimeFormat('vi-VN');
  return `${fmt.format(monday)} - ${fmt.format(sunday)}`;
}

function getStats(tasks) {
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'Hoàn thành').length,
    inProgress: tasks.filter((t) => t.status === 'Đang làm').length,
    blocked: tasks.filter((t) => t.status === 'Tạm dừng').length,
    todo: tasks.filter((t) => t.status === 'Chưa làm').length,
    high: tasks.filter((t) => t.priority === 'Cao').length,
    medium: tasks.filter((t) => t.priority === 'Trung bình').length,
    low: tasks.filter((t) => t.priority === 'Thấp').length
  };
}

router.post('/export', async (_req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const taskResult = await client.query(
      `SELECT id, title, completed_date, priority, status, category, note, created_at, updated_at
       FROM tasks
       ORDER BY COALESCE(completed_date, CURRENT_DATE) ASC, id ASC`
    );

    const tasks = taskResult.rows;
    const stats = getStats(tasks);
    const weekLabel = getWeekLabel();

    const reportResult = await client.query(
      `INSERT INTO weekly_reports (
        week_label,
        total_tasks,
        completed_tasks,
        in_progress_tasks,
        blocked_tasks,
        todo_tasks,
        high_priority_tasks,
        medium_priority_tasks,
        low_priority_tasks,
        pdf_filename
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id, week_label, exported_at, pdf_filename`,
      [
        weekLabel,
        stats.total,
        stats.done,
        stats.inProgress,
        stats.blocked,
        stats.todo,
        stats.high,
        stats.medium,
        stats.low,
        ''
      ]
    );

    const report = reportResult.rows[0];

    for (const task of tasks) {
      await client.query(
        `INSERT INTO task_history (
          report_id, task_id, title, completed_date, priority, status, category, note, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          report.id,
          task.id,
          task.title,
          task.completed_date,
          task.priority,
          task.status,
          task.category,
          task.note,
          task.created_at,
          task.updated_at
        ]
      );
    }

    await client.query('DELETE FROM tasks');
    await client.query('COMMIT');

    res.status(201).json({
      reportId: report.id,
      weekLabel: report.week_label,
      exportedAt: report.exported_at,
      stats
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, week_label, exported_at, total_tasks, completed_tasks,
              in_progress_tasks, blocked_tasks, todo_tasks,
              high_priority_tasks, medium_priority_tasks, low_priority_tasks,
              pdf_filename
       FROM weekly_reports
       ORDER BY exported_at DESC`
    );

    const rows = result.rows.map((row) => ({
      ...row,
      pdf_url: row.pdf_filename ? `/reports/files/${row.pdf_filename}` : null
    }));

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const reportId = Number(req.params.id);
    if (Number.isNaN(reportId)) {
      return res.status(400).json({ error: 'ID báo cáo không hợp lệ.' });
    }

    const reportResult = await pool.query(
      `SELECT id, week_label, exported_at, total_tasks, completed_tasks,
              in_progress_tasks, blocked_tasks, todo_tasks,
              high_priority_tasks, medium_priority_tasks, low_priority_tasks,
              pdf_filename
       FROM weekly_reports
       WHERE id = $1`,
      [reportId]
    );

    if (!reportResult.rowCount) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo.' });
    }

    const tasksResult = await pool.query(
      `SELECT task_id, title, completed_date, priority, status, category, note, created_at, updated_at
       FROM task_history
       WHERE report_id = $1
       ORDER BY COALESCE(completed_date, CURRENT_DATE) ASC, id ASC`,
      [reportId]
    );

    res.json({
      ...reportResult.rows[0],
      pdf_url: reportResult.rows[0].pdf_filename
        ? `/reports/files/${reportResult.rows[0].pdf_filename}`
        : null,
      tasks: tasksResult.rows
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/pdf', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const reportId = Number(req.params.id);
    if (Number.isNaN(reportId)) {
      return res.status(400).json({ error: 'ID báo cáo không hợp lệ.' });
    }

    const reportResult = await client.query(
      `SELECT id, week_label, exported_at, total_tasks, completed_tasks,
              in_progress_tasks, blocked_tasks, todo_tasks,
              high_priority_tasks, medium_priority_tasks, low_priority_tasks,
              pdf_filename
       FROM weekly_reports
       WHERE id = $1`,
      [reportId]
    );

    if (!reportResult.rowCount) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo.' });
    }

    const report = reportResult.rows[0];
    const tasksResult = await client.query(
      `SELECT task_id, title, completed_date, priority, status, category, note
       FROM task_history
       WHERE report_id = $1
       ORDER BY COALESCE(completed_date, CURRENT_DATE) ASC, id ASC`,
      [reportId]
    );

    let filename = report.pdf_filename;
    if (!filename) {
      const stats = {
        total: report.total_tasks,
        done: report.completed_tasks,
        inProgress: report.in_progress_tasks,
        blocked: report.blocked_tasks,
        todo: report.todo_tasks,
        high: report.high_priority_tasks,
        medium: report.medium_priority_tasks,
        low: report.low_priority_tasks
      };

      const generated = await createPdfReport({
        weekLabel: report.week_label,
        tasks: tasksResult.rows,
        stats
      });

      filename = generated.filename;
      await client.query(
        `UPDATE weekly_reports
         SET pdf_filename = $1
         WHERE id = $2`,
        [filename, reportId]
      );
    }

    return res.sendFile(path.resolve(process.cwd(), 'uploads/reports', filename), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

export default router;
