const PRIORITIES = new Set(['Cao', 'Trung bình', 'Thấp']);
const STATUSES = new Set(['Chưa làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng']);
const AI_PROJECT_STATUSES = new Set(['Đề xuất', 'Đã duyệt', 'Đang triển khai', 'Hoàn thành', 'Tạm dừng']);

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
export const allowedAiProjectStatuses = [...AI_PROJECT_STATUSES];

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

export function validateAiProjectInput(payload) {
  const errors = [];

  if (!payload.receivedDate || Number.isNaN(Date.parse(payload.receivedDate))) {
    errors.push('Ngày nhận dự án không hợp lệ.');
  }

  if (!payload.proposerName || typeof payload.proposerName !== 'string' || !payload.proposerName.trim()) {
    errors.push('Người đề xuất dự án là bắt buộc.');
  }

  if (!payload.description || typeof payload.description !== 'string' || !payload.description.trim()) {
    errors.push('Mô tả dự án là bắt buộc.');
  }

  if (payload.status && !AI_PROJECT_STATUSES.has(payload.status)) {
    errors.push('Trạng thái dự án không hợp lệ.');
  }

  if (!payload.employeeId && (!payload.employeeName || !payload.employeeName.trim())) {
    errors.push('Nhân viên phụ trách là bắt buộc.');
  }

  for (const [field, label] of [
    ['estimatedDays', 'Thời gian dự kiến'],
    ['actualDays', 'Thời gian thực tế']
  ]) {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
      const value = Number(payload[field]);
      if (Number.isNaN(value) || value < 0 || !Number.isInteger(value)) {
        errors.push(`${label} phải là số nguyên không âm.`);
      }
    }
  }

  for (const [field, label] of [
    ['startDate', 'Ngày bắt đầu'],
    ['targetEndDate', 'Ngày dự kiến kết thúc'],
    ['actualEndDate', 'Ngày kết thúc thực tế']
  ]) {
    if (payload[field] && Number.isNaN(Date.parse(payload[field]))) {
      errors.push(`${label} không hợp lệ.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
