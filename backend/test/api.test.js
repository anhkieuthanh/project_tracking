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
    `TRUNCATE TABLE
      initiative_stage_history,
      operations_records,
      approval_records,
      delivery_cycles,
      solution_designs,
      feasibility_reviews,
      request_forms,
      ai_initiatives,
      employees,
      task_history,
      weekly_reports,
      tasks
     RESTART IDENTITY CASCADE`
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

test('AI initiative lifecycle flow works end to end', async () => {
  const created = await request(app)
    .post('/ai-initiatives')
    .send({
      title: 'Chatbot nội bộ CSKH',
      department: 'Kinh doanh',
      proposerName: 'Phạm Thu Hà',
      ownerEmployeeName: 'Nguyễn Văn A',
      ownerEmployeeRole: 'AI Project Manager',
      requestedAt: '2026-04-09',
      targetDeadline: '2026-05-15',
      priority: 'Cao',
      problemStatement: 'Nhân viên mất nhiều thời gian trả lời câu hỏi lặp lại.',
      objective: 'Tự động hóa trả lời câu hỏi phổ biến.',
      successKpi: 'Giảm 30% thời gian phản hồi.',
      endUsers: 'Nhân viên CSKH',
      usageFrequency: 'Hàng ngày',
      timeBudgetConstraints: 'Go-live trong quý 2 với ngân sách cố định.',
      availableDataStatus: 'Một phần',
      availableDataDetails: 'Có FAQ và transcript 6 tháng.',
      desiredDeadline: '2026-05-10',
      budgetEstimate: '250 triệu',
      painPoints: 'Trả lời thủ công, thiếu nhất quán.',
      notes: 'Ưu tiên cao cho team kinh doanh.'
    })
    .expect(201);

  assert.equal(created.body.current_stage, 'request');
  assert.equal(created.body.requestForm.available_data_status, 'Một phần');

  const list = await request(app)
    .get('/ai-initiatives')
    .query({ priority: 'Cao' })
    .expect(200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].stage_label, 'Yêu cầu AI');

  await request(app)
    .put(`/ai-initiatives/${created.body.id}/feasibility`)
    .send({
      dataScore: 4,
      technicalScore: 4,
      businessScore: 5,
      complianceScore: 3,
      dataSummary: 'Dữ liệu đủ để bắt đầu pilot.',
      technicalSummary: 'Hạ tầng hiện tại hỗ trợ API và search.',
      businessSummary: 'ROI tốt nhờ giảm tải CSKH.',
      complianceSummary: 'Cần kiểm soát PII ở câu hỏi người dùng.',
      reviewedBy: 'BA Lead'
    })
    .expect(200);

  const gate = await request(app)
    .post(`/ai-initiatives/${created.body.id}/gate-review`)
    .send({
      decision: 'Go',
      conditionalItems: [],
      reviewedBy: 'Governance Board'
    })
    .expect(200);
  assert.equal(gate.body.currentStage, 'design');

  await request(app)
    .put(`/ai-initiatives/${created.body.id}/solution-design`)
    .send({
      solutionOption: 'RAG',
      architectureSummary: 'Web app + retrieval service + LLM gateway.',
      integrationRequirements: 'Kết nối CRM và kho tài liệu nội bộ.',
      securityRequirements: 'RBAC, audit log, masking dữ liệu nhạy cảm.',
      monitoringPlan: 'Theo dõi latency, error rate, hallucination.',
      milestonePlan: 'Sprint 1 PoC, Sprint 2 pilot, Sprint 3 go-live.',
      staffingPlan: 'PM, BA, ML Engineer, Backend, Frontend, DevOps.',
      risksAndMitigations: 'Prompt injection được chặn bằng policy.',
      updatedBy: 'Tech Lead'
    })
    .expect(200);

  await request(app)
    .put(`/ai-initiatives/${created.body.id}/delivery`)
    .send({
      pocStatus: 'Hoàn thành',
      modelTestStatus: 'Hoàn thành',
      uatStatus: 'Hoàn thành',
      securityTestStatus: 'Hoàn thành',
      modelCardStatus: 'Hoàn thành',
      performanceMetrics: 'Latency P95 2.1s, accuracy nội bộ 89%.',
      pilotFeedback: 'Người dùng pilot phản hồi tích cực.',
      deliveryNotes: 'Sẵn sàng chuyển phê duyệt.',
      updatedBy: 'Delivery Manager'
    })
    .expect(200);

  const approvalConflict = await request(app)
    .put(`/ai-initiatives/${created.body.id}/approvals`)
    .send({
      governanceApproved: true,
      techApproved: true,
      legalApproved: true,
      businessApproved: true,
      checklist: {
        performance: true,
        security: false,
        documentation: true,
        rollback: true,
        monitoring: true,
        training: true,
        sla: true,
        budget: true,
        incident: true
      },
      readyForGoLive: true,
      approvalNotes: 'Thiếu security chưa được go live.',
      updatedBy: 'PM'
    })
    .expect(409);
  assert.match(approvalConflict.body.error, /Ready for Go-Live/);

  const approvals = await request(app)
    .put(`/ai-initiatives/${created.body.id}/approvals`)
    .send({
      governanceApproved: true,
      techApproved: true,
      legalApproved: true,
      businessApproved: true,
      checklist: {
        performance: true,
        security: true,
        documentation: true,
        rollback: true,
        monitoring: true,
        training: true,
        sla: true,
        budget: true,
        incident: true
      },
      readyForGoLive: true,
      approvalNotes: 'Đủ điều kiện go-live.',
      updatedBy: 'PM'
    })
    .expect(200);
  assert.equal(approvals.body.ready_for_go_live, true);

  const operations = await request(app)
    .put(`/ai-initiatives/${created.body.id}/operations`)
    .send({
      rolloutStrategy: 'Canary Release',
      slaSlo: '99.5% availability, P95 dưới 3 giây.',
      alertingSetup: 'Alert theo error rate, latency, drift.',
      kpiImpact: 'Giảm 35% ticket lặp lại sau 2 tuần pilot.',
      incidentLog: 'Chưa có P1/P2.',
      continuousImprovement: 'Review drift hàng tuần và retraining hàng quý.',
      adoptionPlan: 'Đào tạo 2 buổi cho CSKH và sales.',
      operationalNotes: 'Theo dõi thêm saturation giờ cao điểm.',
      updatedBy: 'MLOps'
    })
    .expect(200);
  assert.equal(operations.body.rollout_strategy, 'Canary Release');

  const detail = await request(app).get(`/ai-initiatives/${created.body.id}`).expect(200);
  assert.equal(detail.body.current_stage, 'operations');
  assert.ok(detail.body.stageHistory.length >= 5);

  const dashboard = await request(app).get('/ai-initiatives/dashboard/summary').expect(200);
  assert.equal(dashboard.body.totals.initiatives, 1);
  assert.equal(dashboard.body.totals.approvalBacklog, 0);
  assert.equal(dashboard.body.byStage[0].total, 1);
  assert.equal(dashboard.body.byOwner[0].owner_name, 'Nguyễn Văn A');
});

test('No-Go blocks later phases and keeps record queryable', async () => {
  const created = await request(app)
    .post('/ai-initiatives')
    .send({
      title: 'Dự báo nghỉ việc',
      department: 'Nhân sự',
      proposerName: 'Lê Minh',
      ownerEmployeeName: 'Trần B',
      requestedAt: '2026-04-11',
      targetDeadline: '2026-06-01',
      priority: 'Trung bình',
      problemStatement: 'Cần nhận diện nguy cơ nghỉ việc.',
      objective: 'Ưu tiên giữ chân nhân sự chủ chốt.',
      successKpi: 'Giảm turnover 10%.',
      endUsers: 'HRBP',
      usageFrequency: 'Hàng tuần',
      timeBudgetConstraints: 'Nguồn lực hạn chế.',
      availableDataStatus: 'Không',
      availableDataDetails: 'Dữ liệu phân tán.',
      desiredDeadline: '2026-06-01',
      budgetEstimate: '100 triệu',
      painPoints: 'Thiếu dữ liệu lịch sử.',
      notes: ''
    })
    .expect(201);

  await request(app)
    .put(`/ai-initiatives/${created.body.id}/feasibility`)
    .send({
      dataScore: 1,
      technicalScore: 2,
      businessScore: 3,
      complianceScore: 2,
      dataSummary: 'Dữ liệu thiếu và không đồng nhất.',
      technicalSummary: 'Cần nhiều tích hợp mới.',
      businessSummary: 'Giá trị có nhưng chưa đo được rõ.',
      complianceSummary: 'Rủi ro đạo đức cao.',
      reviewedBy: 'BA'
    })
    .expect(200);

  await request(app)
    .post(`/ai-initiatives/${created.body.id}/gate-review`)
    .send({
      decision: 'No-Go',
      conditionalItems: [],
      reviewedBy: 'Board'
    })
    .expect(200);

  const blocked = await request(app)
    .put(`/ai-initiatives/${created.body.id}/solution-design`)
    .send({
      solutionOption: 'Build',
      architectureSummary: 'N/A',
      integrationRequirements: 'N/A',
      securityRequirements: 'N/A',
      monitoringPlan: 'N/A',
      milestonePlan: 'N/A'
    })
    .expect(409);

  assert.match(blocked.body.error, /No-Go|khóa/i);

  const detail = await request(app).get(`/ai-initiatives/${created.body.id}`).expect(200);
  assert.equal(detail.body.current_stage, 'no_go');
});
