const PRIORITIES = new Set(['Cao', 'Trung bình', 'Thấp']);
const STATUSES = new Set(['Chưa làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng']);
const DATA_STATUSES = new Set(['Có', 'Không', 'Một phần']);
const GATE_DECISIONS = new Set(['Go', 'Conditional Go', 'No-Go']);
const SOLUTION_OPTIONS = new Set(['Build', 'Buy', 'Fine-tune', 'RAG', 'API / Third-party']);
const DELIVERY_STATUSES = new Set(['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng']);
const ROLLOUT_STRATEGIES = new Set([
  'Shadow Mode',
  'Canary Release',
  'Blue-Green',
  'Feature Flag'
]);

export function validateTaskInput(payload) {
  const errors = [];

  if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
    errors.push('Tên công việc là bắt buộc.');
  }

  if (!payload.category || typeof payload.category !== 'string' || !payload.category.trim()) {
    errors.push('Phân loại là bắt buộc.');
  }

  if (payload.priority && !PRIORITIES.has(payload.priority)) {
    errors.push('Ưu tiên không hợp lệ.');
  }

  if (payload.status && !STATUSES.has(payload.status)) {
    errors.push('Trạng thái không hợp lệ.');
  }

  if (payload.completedDate && Number.isNaN(Date.parse(payload.completedDate))) {
    errors.push('Ngày hoàn thành không hợp lệ.');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export const allowedPriorities = [...PRIORITIES];
export const allowedStatuses = [...STATUSES];

export function validateEmployeeInput(payload) {
  const errors = [];

  if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
    errors.push('Tên nhân viên là bắt buộc.');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

function validateRequiredString(errors, value, label) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} là bắt buộc.`);
  }
}

function validateOptionalDate(errors, value, label) {
  if (value && Number.isNaN(Date.parse(value))) {
    errors.push(`${label} không hợp lệ.`);
  }
}

function validateScore(errors, value, label) {
  if (value === undefined || value === null || value === '') {
    errors.push(`${label} là bắt buộc.`);
    return;
  }
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    errors.push(`${label} phải là số nguyên từ 1 đến 5.`);
  }
}

export function validateRequestFormInput(payload) {
  const errors = [];

  validateRequiredString(errors, payload.title, 'Tên dự án');
  validateRequiredString(errors, payload.department, 'Bộ phận đề xuất');
  validateRequiredString(errors, payload.proposerName, 'Người đề xuất');
  validateRequiredString(errors, payload.problemStatement, 'Mô tả vấn đề');
  validateRequiredString(errors, payload.objective, 'Mục tiêu kỳ vọng');
  validateRequiredString(errors, payload.successKpi, 'KPI đo lường');
  validateRequiredString(errors, payload.endUsers, 'Người dùng cuối');
  validateRequiredString(errors, payload.usageFrequency, 'Tần suất sử dụng');
  validateRequiredString(errors, payload.timeBudgetConstraints, 'Ràng buộc thời gian và ngân sách');

  if (!payload.requestedAt || Number.isNaN(Date.parse(payload.requestedAt))) {
    errors.push('Ngày đề xuất không hợp lệ.');
  }

  if (!payload.priority || !PRIORITIES.has(payload.priority)) {
    errors.push('Mức độ ưu tiên không hợp lệ.');
  }

  if (!payload.availableDataStatus || !DATA_STATUSES.has(payload.availableDataStatus)) {
    errors.push('Trạng thái dữ liệu sẵn có không hợp lệ.');
  }

  validateOptionalDate(errors, payload.targetDeadline, 'Thời hạn mong muốn');
  validateOptionalDate(errors, payload.desiredDeadline, 'Deadline ARF');

  return {
    ok: errors.length === 0,
    errors
  };
}

export function validateFeasibilityInput(payload) {
  const errors = [];

  validateScore(errors, payload.dataScore, 'Điểm dữ liệu');
  validateScore(errors, payload.technicalScore, 'Điểm kỹ thuật');
  validateScore(errors, payload.businessScore, 'Điểm kinh doanh');
  validateScore(errors, payload.complianceScore, 'Điểm tuân thủ');
  validateRequiredString(errors, payload.dataSummary, 'Đánh giá dữ liệu');
  validateRequiredString(errors, payload.technicalSummary, 'Đánh giá kỹ thuật');
  validateRequiredString(errors, payload.businessSummary, 'Đánh giá kinh doanh');
  validateRequiredString(errors, payload.complianceSummary, 'Đánh giá tuân thủ');

  return {
    ok: errors.length === 0,
    errors
  };
}

export function validateGateReviewInput(payload) {
  const errors = [];

  if (!payload.decision || !GATE_DECISIONS.has(payload.decision)) {
    errors.push('Kết quả gate review không hợp lệ.');
  }

  if (payload.decision === 'Conditional Go') {
    const items = Array.isArray(payload.conditionalItems) ? payload.conditionalItems : [];
    if (!items.length || items.some((item) => typeof item !== 'string' || !item.trim())) {
      errors.push('Conditional Go cần danh sách điều kiện hợp lệ.');
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function validateSolutionDesignInput(payload) {
  const errors = [];

  if (!payload.solutionOption || !SOLUTION_OPTIONS.has(payload.solutionOption)) {
    errors.push('Phương án giải pháp không hợp lệ.');
  }

  validateRequiredString(errors, payload.architectureSummary, 'Tóm tắt kiến trúc');
  validateRequiredString(errors, payload.integrationRequirements, 'Yêu cầu tích hợp');
  validateRequiredString(errors, payload.securityRequirements, 'Yêu cầu bảo mật');
  validateRequiredString(errors, payload.monitoringPlan, 'Kế hoạch monitoring');
  validateRequiredString(errors, payload.milestonePlan, 'Kế hoạch milestone');

  return {
    ok: errors.length === 0,
    errors
  };
}

export function validateDeliveryInput(payload) {
  const errors = [];

  for (const [field, label] of [
    ['pocStatus', 'Trạng thái PoC'],
    ['modelTestStatus', 'Trạng thái kiểm thử mô hình'],
    ['uatStatus', 'Trạng thái UAT'],
    ['securityTestStatus', 'Trạng thái security test'],
    ['modelCardStatus', 'Trạng thái model card']
  ]) {
    if (!payload[field] || !DELIVERY_STATUSES.has(payload[field])) {
      errors.push(`${label} không hợp lệ.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function validateApprovalInput(payload) {
  const errors = [];
  const checklist = payload.checklist || {};

  for (const [field, label] of [
    ['governanceApproved', 'Phê duyệt AI Governance'],
    ['techApproved', 'Phê duyệt Tech Lead'],
    ['legalApproved', 'Phê duyệt Legal/DPO'],
    ['businessApproved', 'Phê duyệt Business Owner']
  ]) {
    if (typeof payload[field] !== 'boolean') {
      errors.push(`${label} phải là true/false.`);
    }
  }

  const requiredChecklistKeys = [
    'performance',
    'security',
    'documentation',
    'rollback',
    'monitoring',
    'training',
    'sla',
    'budget',
    'incident'
  ];

  for (const key of requiredChecklistKeys) {
    if (typeof checklist[key] !== 'boolean') {
      errors.push(`Checklist ${key} phải là true/false.`);
    }
  }

  if (payload.readyForGoLive !== undefined && typeof payload.readyForGoLive !== 'boolean') {
    errors.push('Trạng thái ready for go-live phải là true/false.');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function validateOperationsInput(payload) {
  const errors = [];

  if (!payload.rolloutStrategy || !ROLLOUT_STRATEGIES.has(payload.rolloutStrategy)) {
    errors.push('Chiến lược rollout không hợp lệ.');
  }

  validateRequiredString(errors, payload.slaSlo, 'SLA/SLO');
  validateRequiredString(errors, payload.alertingSetup, 'Alerting setup');
  validateRequiredString(errors, payload.kpiImpact, 'KPI impact');
  validateRequiredString(errors, payload.continuousImprovement, 'Kế hoạch cải tiến');

  return {
    ok: errors.length === 0,
    errors
  };
}
