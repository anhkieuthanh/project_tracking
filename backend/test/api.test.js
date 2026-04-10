import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/weekly_tracking';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const { initDb, pool } = await import('../src/db.js');
const { createApp } = await import('../src/app.js');

await initDb();
const app = createApp();

async function resetDb() {
  await pool.query(
    'TRUNCATE TABLE ai_projects, employees, task_history, weekly_reports, tasks RESTART IDENTITY CASCADE'
  );
}

test.before(async () => {
  await resetDb();
});

test.beforeEach(async () => {
  await resetDb();
});

test.after(async () => {
  await resetDb();
  await pool.end();
});

test('GET /health returns ok', async () => {
  const response = await request(app).get('/health').expect(200);
  assert.equal(response.body.ok, true);
  assert.ok(response.body.timestamp);
});

test('task CRUD flow works', async () => {
  const created = await request(app)
    .post('/tasks')
    .send({
      title: 'Hoan thien bao cao',
      completedDate: '2026-04-09',
      priority: 'Cao',
      status: 'Đang làm',
      category: 'Report',
      note: 'Ban nhap 1'
    })
    .expect(201);

  assert.equal(created.body.title, 'Hoan thien bao cao');

  const list1 = await request(app).get('/tasks').expect(200);
  assert.equal(list1.body.length, 1);

  const updated = await request(app)
    .put(`/tasks/${created.body.id}`)
    .send({
      title: 'Hoan thien bao cao final',
      completedDate: '2026-04-10',
      priority: 'Trung bình',
      status: 'Hoàn thành',
      category: 'Report',
      note: 'Da xong'
    })
    .expect(200);

  assert.equal(updated.body.status, 'Hoàn thành');

  await request(app).delete(`/tasks/${created.body.id}`).expect(204);

  const list2 = await request(app).get('/tasks').expect(200);
  assert.equal(list2.body.length, 0);
});

test('close week moves tasks to history and resets weekly tasks', async () => {
  await request(app)
    .post('/tasks')
    .send({
      title: 'Task 1',
      completedDate: '2026-04-09',
      priority: 'Cao',
      status: 'Hoàn thành',
      category: 'Dev',
      note: ''
    })
    .expect(201);

  await request(app)
    .post('/tasks')
    .send({
      title: 'Task 2',
      completedDate: '2026-04-10',
      priority: 'Thấp',
      status: 'Chưa làm',
      category: 'Meeting',
      note: 'cho phan hoi'
    })
    .expect(201);

  const exportResponse = await request(app).post('/reports/export').expect(201);

  assert.ok(exportResponse.body.reportId);
  assert.equal(exportResponse.body.stats.total, 2);

  const weeklyTasks = await request(app).get('/tasks').expect(200);
  assert.equal(weeklyTasks.body.length, 0);

  const reports = await request(app).get('/reports').expect(200);
  assert.equal(reports.body.length, 1);

  const detail = await request(app).get(`/reports/${exportResponse.body.reportId}`).expect(200);
  assert.equal(detail.body.tasks.length, 2);
});

test('AI project CRUD + dashboard + filter works', async () => {
  const employee = await request(app)
    .post('/employees')
    .send({ name: 'Nguyen Van A' })
    .expect(201);

  const projectCreated = await request(app)
    .post('/ai-projects')
    .send({
      receivedDate: '2026-04-09',
      proposerName: 'Pham Thu Ha',
      description: 'Xay chatbot CSKH cho phong kinh doanh',
      status: 'Đang triển khai',
      employeeId: employee.body.id,
      estimatedDays: 10,
      actualDays: 4,
      startDate: '2026-04-10',
      targetEndDate: '2026-04-20',
      actualEndDate: null
    })
    .expect(201);

  assert.equal(projectCreated.body.employee_name, 'Nguyen Van A');

  const projectCreatedWithNewEmployee = await request(app)
    .post('/ai-projects')
    .send({
      receivedDate: '2026-04-11',
      proposerName: 'Le Van B',
      description: 'He thong tom tat hop noi bo',
      status: 'Hoàn thành',
      employeeName: 'Tran Thi B',
      estimatedDays: 7,
      actualDays: 6,
      startDate: '2026-04-11',
      targetEndDate: '2026-04-18',
      actualEndDate: '2026-04-17'
    })
    .expect(201);

  assert.equal(projectCreatedWithNewEmployee.body.employee_name, 'Tran Thi B');

  const filtered = await request(app)
    .get('/ai-projects')
    .query({ status: 'Hoàn thành' })
    .expect(200);
  assert.equal(filtered.body.length, 1);
  assert.equal(filtered.body[0].status, 'Hoàn thành');

  const updated = await request(app)
    .put(`/ai-projects/${projectCreated.body.id}`)
    .send({
      receivedDate: '2026-04-09',
      proposerName: 'Pham Thu Ha',
      description: 'Xay chatbot CSKH cho phong kinh doanh (v2)',
      status: 'Tạm dừng',
      employeeId: employee.body.id,
      estimatedDays: 12,
      actualDays: 5,
      startDate: '2026-04-10',
      targetEndDate: '2026-04-22',
      actualEndDate: null
    })
    .expect(200);
  assert.equal(updated.body.status, 'Tạm dừng');

  const dashboard = await request(app).get('/ai-projects/dashboard/summary').expect(200);
  assert.equal(dashboard.body.kpi.total, 2);
  assert.equal(dashboard.body.kpi.completed, 1);
  assert.equal(dashboard.body.kpi.paused, 1);
  assert.ok(dashboard.body.byStatus.length >= 2);
  assert.ok(dashboard.body.byEmployee.length >= 2);

  await request(app).delete(`/ai-projects/${projectCreated.body.id}`).expect(204);
});
