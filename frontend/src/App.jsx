import { useEffect, useMemo, useState } from 'react';
import {
  closeWeek,
  createAiInitiative,
  createTask,
  getAiDashboard,
  getAiInitiativeDetail,
  getAiInitiatives,
  getReportById,
  getReportPdfUrl,
  getReports,
  getTaskCategories,
  getTasks,
  removeTask,
  submitGateReview,
  updateAiInitiative,
  updateApprovals,
  updateDelivery,
  updateFeasibility,
  updateOperations,
  updateSolutionDesign,
  updateTask
} from './api';

const initialTaskForm = {
  title: '',
  completedDate: '',
  priority: 'Trung bình',
  status: 'Chưa làm',
  category: '',
  note: ''
};

const initialRequestForm = {
  code: '',
  title: '',
  department: '',
  proposerName: '',
  requestedAt: '',
  expectedCompletionDate: '',
  priority: 'Trung bình',
  problemStatement: '',
  objective: '',
  successKpi: '',
  endUsers: '',
  usageFrequency: '',
  availableDataStatus: 'Một phần',
  availableDataDetails: '',
  budgetEstimate: '',
  painPoints: '',
  notes: '',
  updatedBy: 'PM'
};

const initialFeasibilityForm = {
  dataScore: 3,
  technicalScore: 3,
  businessScore: 3,
  complianceScore: 3,
  dataSummary: '',
  technicalSummary: '',
  businessSummary: '',
  complianceSummary: '',
  reviewedBy: 'BA Lead'
};

const initialGateForm = {
  decision: 'Go',
  conditionalItems: '',
  reviewedBy: 'Governance Board'
};

const initialSolutionForm = {
  solutionOption: 'RAG',
  architectureSummary: '',
  integrationRequirements: '',
  securityRequirements: '',
  monitoringPlan: '',
  milestonePlan: '',
  staffingPlan: '',
  risksAndMitigations: '',
  updatedBy: 'Tech Lead'
};

const initialDeliveryForm = {
  pocStatus: 'Chưa bắt đầu',
  modelTestStatus: 'Chưa bắt đầu',
  uatStatus: 'Chưa bắt đầu',
  securityTestStatus: 'Chưa bắt đầu',
  modelCardStatus: 'Chưa bắt đầu',
  performanceMetrics: '',
  pilotFeedback: '',
  deliveryNotes: '',
  updatedBy: 'Delivery Manager'
};

const initialApprovalForm = {
  governanceApproved: false,
  techApproved: false,
  legalApproved: false,
  businessApproved: false,
  checklist: {
    performance: false,
    security: false,
    documentation: false,
    rollback: false,
    monitoring: false,
    training: false,
    sla: false,
    budget: false,
    incident: false
  },
  readyForGoLive: false,
  approvalNotes: '',
  updatedBy: 'PM'
};

const initialOperationsForm = {
  rolloutStrategy: 'Canary Release',
  slaSlo: '',
  alertingSetup: '',
  kpiImpact: '',
  incidentLog: '',
  continuousImprovement: '',
  adoptionPlan: '',
  operationalNotes: '',
  updatedBy: 'MLOps'
};

const priorities = ['Cao', 'Trung bình', 'Thấp'];
const statuses = ['Chưa làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'];
const stageItems = [
  ['request', 'Yêu cầu AI'],
  ['feasibility', 'Đánh giá khả thi'],
  ['design', 'Thiết kế giải pháp'],
  ['delivery', 'Triển khai & thử nghiệm'],
  ['approval', 'Phê duyệt'],
  ['operations', 'Vận hành'],
  ['no_go', 'No-Go']
];
const workflowStageItems = stageItems.slice(0, 6);
const solutionOptions = ['Build', 'Buy', 'Fine-tune', 'RAG', 'API / Third-party'];
const deliveryStatuses = ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng'];
const rolloutStrategies = ['Shadow Mode', 'Canary Release', 'Blue-Green', 'Feature Flag'];

const menuSections = [
  {
    title: null,
    items: [{ id: 'home', label: 'Home' }]
  },
  {
    title: 'Quản lý công việc',
    items: [
      { id: 'work-dashboard', label: 'Dashboard' },
      { id: 'week', label: 'Công việc tuần hiện tại' },
      { id: 'history', label: 'Lịch sử' }
    ]
  },
  {
    title: 'Dự án AI',
    items: [
      { id: 'ai-dashboard', label: 'Dashboard' },
      { id: 'ai-list', label: 'Danh sách dự án' },
      { id: 'ai-new', label: 'Tạo dự án mới' }
    ]
  }
];

const menuLabels = Object.fromEntries(
  menuSections.flatMap((section) => section.items.map((item) => [item.id, item.label]))
);

function formatDate(value) {
  return value ? String(value).slice(0, 10) : '';
}

function getActiveWorkflowStage(stage) {
  if (!stage || stage === 'no_go') {
    return 'feasibility';
  }
  return stage;
}

function normalizeTaskForForm(task) {
  return {
    title: task.title,
    completedDate: formatDate(task.completed_date),
    priority: task.priority,
    status: task.status,
    category: task.category,
    note: task.note || ''
  };
}

function normalizeRequestForm(detail) {
  const form = detail?.requestForm || {};
  return {
    code: detail?.code || '',
    title: detail?.title || '',
    department: detail?.department || '',
    proposerName: detail?.proposer_name || '',
    requestedAt: formatDate(detail?.requested_at),
    expectedCompletionDate:
      formatDate(form.expected_completion_date) || formatDate(detail?.target_deadline),
    priority: detail?.priority || 'Trung bình',
    problemStatement: form.problem_statement || '',
    objective: form.objective || '',
    successKpi: form.success_kpi || '',
    endUsers: form.end_users || '',
    usageFrequency: form.usage_frequency || '',
    availableDataStatus: form.available_data_status || 'Một phần',
    availableDataDetails: form.available_data_details || '',
    budgetEstimate: form.budget_estimate || '',
    painPoints: form.pain_points || '',
    notes: form.notes || '',
    updatedBy: 'PM'
  };
}

function normalizeFeasibilityForm(detail) {
  const data = detail?.feasibility || {};
  return {
    dataScore: data.data_score || 3,
    technicalScore: data.technical_score || 3,
    businessScore: data.business_score || 3,
    complianceScore: data.compliance_score || 3,
    dataSummary: data.data_summary || '',
    technicalSummary: data.technical_summary || '',
    businessSummary: data.business_summary || '',
    complianceSummary: data.compliance_summary || '',
    reviewedBy: data.reviewed_by || 'BA Lead'
  };
}

function normalizeGateForm(detail) {
  const data = detail?.feasibility || {};
  return {
    decision: data.decision || 'Go',
    conditionalItems: Array.isArray(data.conditional_items) ? data.conditional_items.join('\n') : '',
    reviewedBy: data.reviewed_by || 'Governance Board'
  };
}

function normalizeSolutionForm(detail) {
  const data = detail?.solutionDesign || {};
  return {
    solutionOption: data.solution_option || 'RAG',
    architectureSummary: data.architecture_summary || '',
    integrationRequirements: data.integration_requirements || '',
    securityRequirements: data.security_requirements || '',
    monitoringPlan: data.monitoring_plan || '',
    milestonePlan: data.milestone_plan || '',
    staffingPlan: data.staffing_plan || '',
    risksAndMitigations: data.risks_and_mitigations || '',
    updatedBy: 'Tech Lead'
  };
}

function normalizeDeliveryForm(detail) {
  const data = detail?.delivery || {};
  return {
    pocStatus: data.poc_status || 'Chưa bắt đầu',
    modelTestStatus: data.model_test_status || 'Chưa bắt đầu',
    uatStatus: data.uat_status || 'Chưa bắt đầu',
    securityTestStatus: data.security_test_status || 'Chưa bắt đầu',
    modelCardStatus: data.model_card_status || 'Chưa bắt đầu',
    performanceMetrics: data.performance_metrics || '',
    pilotFeedback: data.pilot_feedback || '',
    deliveryNotes: data.delivery_notes || '',
    updatedBy: 'Delivery Manager'
  };
}

function normalizeApprovalForm(detail) {
  const data = detail?.approvals || {};
  return {
    governanceApproved: Boolean(data.governance_approved),
    techApproved: Boolean(data.tech_approved),
    legalApproved: Boolean(data.legal_approved),
    businessApproved: Boolean(data.business_approved),
    checklist: {
      ...initialApprovalForm.checklist,
      ...(data.checklist || {})
    },
    readyForGoLive: Boolean(data.ready_for_go_live),
    approvalNotes: data.approval_notes || '',
    updatedBy: 'PM'
  };
}

function normalizeOperationsForm(detail) {
  const data = detail?.operations || {};
  return {
    rolloutStrategy: data.rollout_strategy || 'Canary Release',
    slaSlo: data.sla_slo || '',
    alertingSetup: data.alerting_setup || '',
    kpiImpact: data.kpi_impact || '',
    incidentLog: data.incident_log || '',
    continuousImprovement: data.continuous_improvement || '',
    adoptionPlan: data.adoption_plan || '',
    operationalNotes: data.operational_notes || '',
    updatedBy: 'MLOps'
  };
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function StagePill({ stage }) {
  const label = stageItems.find((item) => item[0] === stage)?.[1] || stage;
  return <span className={`stage-pill stage-${stage}`}>{label}</span>;
}

function DashboardCard({ label, value, helper }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </article>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {description ? <p className="subtle">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function PhaseHeader({ title, description }) {
  return (
    <div className="phase-header">
      <div>
        <h3>{title}</h3>
        {description ? <p className="subtle">{description}</p> : null}
      </div>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState('home');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [taskCategories, setTaskCategories] = useState([]);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const [aiInitiatives, setAiInitiatives] = useState([]);
  const [initiativeSearch, setInitiativeSearch] = useState('');
  const [selectedInitiativeId, setSelectedInitiativeId] = useState(null);
  const [initiativeDetail, setInitiativeDetail] = useState(null);
  const [activeWorkflowStage, setActiveWorkflowStage] = useState('request');

  const [dashboard, setDashboard] = useState({
    totals: { initiatives: 0, approvalBacklog: 0, nearingDeadline: 0 },
    byStage: [],
    byDecision: [],
    byProposer: [],
    nearingDeadline: []
  });

  const [filters, setFilters] = useState({
    code: '',
    priority: '',
    proposerName: ''
  });

  const [requestForm, setRequestForm] = useState(initialRequestForm);
  const [feasibilityForm, setFeasibilityForm] = useState(initialFeasibilityForm);
  const [gateForm, setGateForm] = useState(initialGateForm);
  const [solutionForm, setSolutionForm] = useState(initialSolutionForm);
  const [deliveryForm, setDeliveryForm] = useState(initialDeliveryForm);
  const [approvalForm, setApprovalForm] = useState(initialApprovalForm);
  const [operationsForm, setOperationsForm] = useState(initialOperationsForm);

  const weeklySummary = useMemo(
    () => ({
      total: tasks.length,
      done: tasks.filter((task) => task.status === 'Hoàn thành').length,
      inProgress: tasks.filter((task) => task.status === 'Đang làm').length,
      paused: tasks.filter((task) => task.status === 'Tạm dừng').length,
      todo: tasks.filter((task) => task.status === 'Chưa làm').length
    }),
    [tasks]
  );

  const filteredInitiatives = useMemo(() => {
    const keyword = initiativeSearch.trim().toLowerCase();
    if (!keyword) {
      return aiInitiatives;
    }
    return aiInitiatives.filter((initiative) =>
      [initiative.code, initiative.title, initiative.department, initiative.proposer_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [aiInitiatives, initiativeSearch]);

  const initiativeOverview = useMemo(() => {
    if (!initiativeDetail) {
      return {
        completedPhases: 0,
        currentPhaseLabel: 'Chưa khởi tạo',
        readinessLabel: 'Hồ sơ mới',
        progressPercent: 0
      };
    }

    const completedPhases = [
      Boolean(initiativeDetail.requestForm),
      Boolean(initiativeDetail.feasibility),
      Boolean(initiativeDetail.solutionDesign),
      Boolean(initiativeDetail.delivery),
      Boolean(initiativeDetail.approvals?.ready_for_go_live),
      Boolean(initiativeDetail.operations)
    ].filter(Boolean).length;

    return {
      completedPhases,
      currentPhaseLabel:
        stageItems.find(([stage]) => stage === initiativeDetail.current_stage)?.[1] || 'Chưa xác định',
      readinessLabel: initiativeDetail.approvals?.ready_for_go_live
        ? 'Ready for Go-Live'
        : initiativeDetail.current_stage === 'operations'
          ? 'Đang vận hành'
          : initiativeDetail.current_stage === 'no_go'
            ? 'No-Go'
            : 'Đang triển khai',
      progressPercent: Math.round((completedPhases / workflowStageItems.length) * 100)
    };
  }, [initiativeDetail]);

  const recentTasks = useMemo(() => tasks.slice(0, 5), [tasks]);
  const recentReports = useMemo(() => reports.slice(0, 5), [reports]);
  const recentInitiatives = useMemo(() => aiInitiatives.slice(0, 6), [aiInitiatives]);
  const currentStageIndex = workflowStageItems.findIndex(
    ([stage]) => stage === getActiveWorkflowStage(initiativeDetail?.current_stage)
  );

  async function loadInitiativeDetail(id) {
    const detail = await getAiInitiativeDetail(id);
    setSelectedInitiativeId(id);
    setInitiativeDetail(detail);
    setActiveWorkflowStage(getActiveWorkflowStage(detail.current_stage));
    setRequestForm(normalizeRequestForm(detail));
    setFeasibilityForm(normalizeFeasibilityForm(detail));
    setGateForm(normalizeGateForm(detail));
    setSolutionForm(normalizeSolutionForm(detail));
    setDeliveryForm(normalizeDeliveryForm(detail));
    setApprovalForm(normalizeApprovalForm(detail));
    setOperationsForm(normalizeOperationsForm(detail));
  }

  function resetAiForms() {
    setRequestForm(initialRequestForm);
    setFeasibilityForm(initialFeasibilityForm);
    setGateForm(initialGateForm);
    setSolutionForm(initialSolutionForm);
    setDeliveryForm(initialDeliveryForm);
    setApprovalForm(initialApprovalForm);
    setOperationsForm(initialOperationsForm);
    setActiveWorkflowStage('request');
  }

  async function loadInitial() {
    setLoading(true);
    setError('');
    try {
      const [taskRows, reportRows, employeeRows, initiativeRows, dashboardRows] = await Promise.all([
        getTasks(),
        getReports(),
        getTaskCategories(),
        getAiInitiatives(),
        getAiDashboard()
      ]);
      setTasks(taskRows);
      setReports(reportRows);
      setTaskCategories(employeeRows);
      setAiInitiatives(initiativeRows);
      setDashboard(dashboardRows);

      if (initiativeRows[0]) {
        await loadInitiativeDetail(initiativeRows[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function reloadAiWorkspace(nextFilters = filters, preferredId = selectedInitiativeId) {
    const [initiativeRows, dashboardRows] = await Promise.all([
      getAiInitiatives(nextFilters),
      getAiDashboard()
    ]);
    setAiInitiatives(initiativeRows);
    setDashboard(dashboardRows);

    const nextId =
      preferredId && initiativeRows.some((item) => item.id === preferredId)
        ? preferredId
        : initiativeRows[0]?.id || null;

    if (nextId) {
      await loadInitiativeDetail(nextId);
    } else {
      setSelectedInitiativeId(null);
      setInitiativeDetail(null);
      resetAiForms();
    }
  }

  useEffect(() => {
    loadInitial();
  }, []);

  function handleTaskChange(event) {
    const { name, value } = event.target;
    setTaskForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleRequestChange(event) {
    const { name, value } = event.target;
    setRequestForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSimpleForm(setter) {
    return (event) => {
      const { name, value } = event.target;
      setter((prev) => ({ ...prev, [name]: value }));
    };
  }

  function handleApprovalChecklist(key, value) {
    setApprovalForm((prev) => ({
      ...prev,
      checklist: { ...prev.checklist, [key]: value }
    }));
  }

  async function handleTaskSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      if (editingTaskId) {
        await updateTask(editingTaskId, taskForm);
        setMessage('Đã cập nhật công việc tuần.');
      } else {
        await createTask(taskForm);
        setMessage('Đã thêm công việc tuần.');
      }
      setTaskForm(initialTaskForm);
      setEditingTaskId(null);
      const [taskRows, categories] = await Promise.all([getTasks(), getTaskCategories()]);
      setTasks(taskRows);
      setTaskCategories(categories);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTask(id) {
    if (!window.confirm('Bạn chắc chắn muốn xóa công việc này?')) {
      return;
    }
    try {
      await removeTask(id);
      const [taskRows, categories] = await Promise.all([getTasks(), getTaskCategories()]);
      setTasks(taskRows);
      setTaskCategories(categories);
      setMessage('Đã xóa công việc.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCloseWeek() {
    if (!window.confirm('Chốt tuần sẽ chuyển toàn bộ task sang lịch sử. Tiếp tục?')) {
      return;
    }
    try {
      await closeWeek();
      const [taskRows, reportRows, categories] = await Promise.all([getTasks(), getReports(), getTaskCategories()]);
      setTasks(taskRows);
      setReports(reportRows);
      setTaskCategories(categories);
      setSelectedReport(null);
      setActiveView('history');
      setMessage('Chốt tuần thành công.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleOpenReport(reportId) {
    try {
      setSelectedReport(await getReportById(reportId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitRequestForm(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      if (selectedInitiativeId) {
        await updateAiInitiative(selectedInitiativeId, requestForm);
        setMessage('Đã cập nhật AI Request Form.');
        await reloadAiWorkspace(filters, selectedInitiativeId);
      } else {
        const created = await createAiInitiative(requestForm);
        setMessage('Đã tạo hồ sơ AI mới.');
        await reloadAiWorkspace(filters, created.id);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitPhase(action, payload, successMessage) {
    if (!selectedInitiativeId) {
      setError('Hãy tạo hoặc chọn một hồ sơ AI trước.');
      return;
    }
    setError('');
    setMessage('');
    try {
      await action(selectedInitiativeId, payload);
      setMessage(successMessage);
      await reloadAiWorkspace(filters, selectedInitiativeId);
    } catch (err) {
      setError(err.message);
    }
  }

  function startNewInitiative() {
    setSelectedInitiativeId(null);
    setInitiativeDetail(null);
    resetAiForms();
    setActiveView('ai-new');
  }

  async function openInitiativeInForm(id) {
    await loadInitiativeDetail(id);
    setActiveView('ai-new');
  }

  function handleMenuClick(id) {
    if (id === 'ai-new') {
      startNewInitiative();
      return;
    }
    setActiveView(id);
  }

  const activeTabLabel = menuLabels[activeView] || 'Home';

  const homeView = (
    <section className="stack">
      <SectionHeader title="Home" description="Tổng hợp nhanh dashboard công việc tuần và dự án AI trên cùng một trang." />
      <div className="metrics-grid">
        <DashboardCard label="Tổng công việc tuần" value={weeklySummary.total} helper={`${weeklySummary.done} đã hoàn thành`} />
        <DashboardCard label="Dự án AI đang theo dõi" value={dashboard.totals.initiatives} helper={`${dashboard.totals.approvalBacklog} chờ phê duyệt`} />
        <DashboardCard label="Dự án sắp tới deadline" value={dashboard.totals.nearingDeadline} helper="Trong 14 ngày tới" />
      </div>

      <div className="split-panel">
        <article className="card">
          <h2>Dashboard công việc</h2>
          <div className="summary">
            <span>Hoàn thành: {weeklySummary.done}</span>
            <span>Đang làm: {weeklySummary.inProgress}</span>
            <span>Tạm dừng: {weeklySummary.paused}</span>
            <span>Chưa làm: {weeklySummary.todo}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Công việc</th>
                  <th>Ngày</th>
                  <th>Trạng thái</th>
                  <th>Ưu tiên</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.length ? (
                  recentTasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.title}</td>
                      <td>{formatDate(task.completed_date) || '-'}</td>
                      <td>{task.status}</td>
                      <td>{task.priority}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="empty-cell">
                      Chưa có công việc tuần.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h2>Dashboard dự án AI</h2>
          <div className="bars">
            {dashboard.byStage.length ? (
              dashboard.byStage.map((item) => (
                <div key={item.stage} className="bar-row">
                  <span>{item.label}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${dashboard.totals.initiatives ? (item.total / dashboard.totals.initiatives) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <strong>{item.total}</strong>
                </div>
              ))
            ) : (
              <p className="empty-state">Chưa có dữ liệu dự án AI.</p>
            )}
          </div>
        </article>
      </div>

      <div className="split-panel">
        <article className="card">
          <h2>Dự án AI hiện tại</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã hồ sơ</th>
                  <th>Dự án</th>
                  <th>Phase</th>
                  <th>Người đề xuất</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {recentInitiatives.length ? (
                  recentInitiatives.map((initiative) => (
                    <tr key={initiative.id}>
                      <td>{initiative.code}</td>
                      <td>{initiative.title}</td>
                      <td>{initiative.stage_label}</td>
                      <td>{initiative.proposer_name || '-'}</td>
                      <td>{formatDate(initiative.target_deadline) || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-cell">
                      Chưa có dự án AI.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h2>Lịch sử chốt tuần gần nhất</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tuần</th>
                  <th>Ngày export</th>
                  <th>Tổng task</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.length ? (
                  recentReports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.week_label}</td>
                      <td>{formatDate(report.exported_at)}</td>
                      <td>{report.total_tasks}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="empty-cell">
                      Chưa có báo cáo tuần.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );

  const workDashboardView = (
    <section className="stack">
      <SectionHeader title="Dashboard công việc" description="Tập trung riêng vào tình hình công việc tuần, lịch sử chốt tuần và khối lượng còn mở." />
      <div className="metrics-grid">
        <DashboardCard label="Tổng task tuần" value={weeklySummary.total} />
        <DashboardCard label="Đã hoàn thành" value={weeklySummary.done} />
        <DashboardCard label="Đang xử lý / tạm dừng" value={weeklySummary.inProgress + weeklySummary.paused} />
      </div>

      <div className="split-panel">
        <article className="card">
          <h2>Công việc hiện tại</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Công việc</th>
                  <th>Ngày</th>
                  <th>Trạng thái</th>
                  <th>Ưu tiên</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length ? (
                  tasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.title}</td>
                      <td>{formatDate(task.completed_date) || '-'}</td>
                      <td>{task.status}</td>
                      <td>{task.priority}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="empty-cell">
                      Chưa có công việc tuần.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h2>Lịch sử chốt tuần</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tuần</th>
                  <th>Ngày export</th>
                  <th>Tổng task</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.length ? (
                  recentReports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.week_label}</td>
                      <td>{formatDate(report.exported_at)}</td>
                      <td>{report.total_tasks}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="empty-cell">
                      Chưa có dữ liệu lịch sử.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );

  const weekManagementView = (
    <section className="card">
      <SectionHeader title="Công việc tuần hiện tại" description="Quản lý đầu việc tuần như trước, không ảnh hưởng bởi module dự án AI mới." />
      <form className="stack" onSubmit={handleTaskSubmit}>
        <div className="grid two">
          <label>
            Tên công việc
            <input name="title" value={taskForm.title} onChange={handleTaskChange} required />
          </label>
          <label>
            Ngày hoàn thành
            <input type="date" name="completedDate" value={taskForm.completedDate} onChange={handleTaskChange} />
          </label>
        </div>
        <div className="grid three">
          <label>
            Ưu tiên
            <select name="priority" value={taskForm.priority} onChange={handleTaskChange}>
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái
            <select name="status" value={taskForm.status} onChange={handleTaskChange}>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Phân loại
            <input name="category" list="task-category-options" value={taskForm.category} onChange={handleTaskChange} required />
          </label>
        </div>
        <datalist id="task-category-options">
          {taskCategories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <label>
          Ghi chú
          <textarea name="note" rows="3" value={taskForm.note} onChange={handleTaskChange} />
        </label>
        <div className="actions">
          <button type="submit" className="btn primary">
            {editingTaskId ? 'Lưu chỉnh sửa' : 'Thêm công việc'}
          </button>
          {editingTaskId ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditingTaskId(null);
                setTaskForm(initialTaskForm);
              }}
            >
              Hủy
            </button>
          ) : null}
          <button type="button" className="btn warning" onClick={handleCloseWeek}>
            Chốt tuần
          </button>
        </div>
      </form>

      <div className="summary">
        <span>Tổng: {weeklySummary.total}</span>
        <span>Hoàn thành: {weeklySummary.done}</span>
        <span>Đang làm: {weeklySummary.inProgress}</span>
        <span>Tạm dừng: {weeklySummary.paused}</span>
        <span>Chưa làm: {weeklySummary.todo}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Công việc</th>
              <th>Ngày</th>
              <th>Ưu tiên</th>
              <th>Trạng thái</th>
              <th>Phân loại</th>
              <th>Ghi chú</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length ? (
              tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{formatDate(task.completed_date) || '-'}</td>
                  <td>{task.priority}</td>
                  <td>{task.status}</td>
                  <td>{task.category}</td>
                  <td>{task.note || '-'}</td>
                  <td>
                    <div className="actions compact">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setEditingTaskId(task.id);
                          setTaskForm(normalizeTaskForForm(task));
                        }}
                      >
                        Sửa
                      </button>
                      <button type="button" className="btn danger" onClick={() => handleDeleteTask(task.id)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-cell">
                  Chưa có công việc tuần.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const historyView = (
    <section className="split-panel">
      <article className="card">
        <SectionHeader title="Lịch sử công việc" description="Xem snapshot sau mỗi lần chốt tuần." />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tuần</th>
                <th>Ngày export</th>
                <th>Tổng task</th>
                <th>Mở</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reports.length ? (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.week_label}</td>
                    <td>{formatDate(report.exported_at)}</td>
                    <td>{report.total_tasks}</td>
                    <td>{report.todo_tasks + report.in_progress_tasks + report.blocked_tasks}</td>
                    <td>
                      <div className="actions compact">
                        <button type="button" className="btn" onClick={() => handleOpenReport(report.id)}>
                          Xem chi tiết
                        </button>
                        <a className="btn" href={getReportPdfUrl(report.id)} target="_blank" rel="noreferrer">
                          Xuất PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-cell">
                    Chưa có lịch sử chốt tuần.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card">
        <h2>Chi tiết báo cáo</h2>
        {selectedReport ? (
          <>
            <div className="summary">
              <span>{selectedReport.week_label}</span>
              <span>Hoàn thành: {selectedReport.completed_tasks}</span>
              <span>Đang làm: {selectedReport.in_progress_tasks}</span>
              <span>Tạm dừng: {selectedReport.blocked_tasks}</span>
            </div>
            <div className="actions">
              <a className="btn primary" href={getReportPdfUrl(selectedReport.id)} target="_blank" rel="noreferrer">
                Xuất PDF tuần đã chọn
              </a>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Công việc</th>
                    <th>Ngày</th>
                    <th>Ưu tiên</th>
                    <th>Trạng thái</th>
                    <th>Phân loại</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.tasks.map((task) => (
                    <tr key={`${selectedReport.id}-${task.task_id}`}>
                      <td>{task.title}</td>
                      <td>{formatDate(task.completed_date) || '-'}</td>
                      <td>{task.priority}</td>
                      <td>{task.status}</td>
                      <td>{task.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="empty-state">Chọn một báo cáo để xem snapshot công việc đã chốt.</p>
        )}
      </article>
    </section>
  );

  const aiDashboardView = (
    <section className="stack">
      <SectionHeader title="Dashboard dự án AI" description="Theo dõi phase, gate decision, người đề xuất và hồ sơ nearing deadline." />
      <div className="metrics-grid">
        <DashboardCard label="Tổng hồ sơ AI" value={dashboard.totals.initiatives} />
        <DashboardCard label="Backlog phê duyệt" value={dashboard.totals.approvalBacklog} />
        <DashboardCard label="Sắp tới deadline" value={dashboard.totals.nearingDeadline} />
      </div>

      <div className="split-panel">
        <article className="card">
          <h2>Phân bổ theo phase</h2>
          <div className="bars">
            {dashboard.byStage.map((item) => (
              <div key={item.stage} className="bar-row">
                <span>{item.label}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${dashboard.totals.initiatives ? (item.total / dashboard.totals.initiatives) * 100 : 0}%`
                    }}
                  />
                </div>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Tỷ lệ Gate Review</h2>
          <div className="bars">
            {dashboard.byDecision.map((item) => (
              <div key={item.gate_decision} className="bar-row">
                <span>{item.gate_decision}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill warm"
                    style={{
                      width: `${dashboard.totals.initiatives ? (item.total / dashboard.totals.initiatives) * 100 : 0}%`
                    }}
                  />
                </div>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="split-panel">
        <article className="card">
          <h2>Khối lượng theo người đề xuất</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Người đề xuất</th>
                  <th>Số hồ sơ</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.byProposer.map((item) => (
                  <tr key={item.proposer_name}>
                    <td>{item.proposer_name}</td>
                    <td>{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h2>Hồ sơ nearing deadline</h2>
          {dashboard.nearingDeadline.length ? (
            <div className="timeline">
              {dashboard.nearingDeadline.map((item) => (
                <div key={item.id} className="timeline-item">
                  <StagePill stage={item.current_stage} />
                  <div>
                    <strong>{item.title}</strong>
                    <p>Deadline: {formatDate(item.target_deadline)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Không có hồ sơ nào sát deadline trong 14 ngày tới.</p>
          )}
        </article>
      </div>
    </section>
  );

  const aiListView = (
    <section className="stack">
      <SectionHeader
        title="Danh sách dự án AI"
        description="Tách riêng khỏi màn điền form. Dùng tab này để lọc, xem toàn bộ portfolio và mở từng hồ sơ."
        action={
          <button type="button" className="btn primary" onClick={startNewInitiative}>
            Tạo dự án mới
          </button>
        }
      />

      <article className="card">
        <div className="grid three">
          <label>
            Mã hồ sơ
            <input
              name="code"
              value={filters.code}
              onChange={handleSimpleForm(setFilters)}
              placeholder="VD: HLAI0001"
            />
          </label>
          <label>
            Priority
            <select name="priority" value={filters.priority} onChange={handleSimpleForm(setFilters)}>
              <option value="">Tất cả</option>
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Người đề xuất
            <input
              name="proposerName"
              value={filters.proposerName}
              onChange={handleSimpleForm(setFilters)}
              placeholder="Nhập tên người đề xuất"
            />
          </label>
        </div>

        <div className="actions">
          <button type="button" className="btn" onClick={() => reloadAiWorkspace(filters, selectedInitiativeId)}>
            Áp dụng filter
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const reset = {
                code: '',
                priority: '',
                proposerName: ''
              };
              setFilters(reset);
              reloadAiWorkspace(reset, selectedInitiativeId);
            }}
          >
            Xóa filter
          </button>
        </div>

        <div className="summary">
          <span>Tổng hồ sơ: {aiInitiatives.length}</span>
          <span>Hiển thị: {filteredInitiatives.length}</span>
        </div>
      </article>

      <div className="split-panel">
        <article className="card">
          <h2>Các dự án hiện tại</h2>
          <div className="initiative-list">
            {filteredInitiatives.length ? (
              filteredInitiatives.map((initiative) => (
                <button
                  key={initiative.id}
                  type="button"
                  className={selectedInitiativeId === initiative.id ? 'initiative-item active' : 'initiative-item'}
                  onClick={() => loadInitiativeDetail(initiative.id)}
                >
                  <strong>{initiative.code}</strong>
                  <span>{initiative.title}</span>
                  <span>{initiative.department}</span>
                  <div className="pill-row">
                    <StagePill stage={initiative.current_stage} />
                    <span className="mini-pill">{initiative.priority}</span>
                    {initiative.gate_decision ? <span className="mini-pill">{initiative.gate_decision}</span> : null}
                  </div>
                  <small>
                    {initiative.proposer_name || 'Chưa có proposer'} · deadline {formatDate(initiative.target_deadline) || '-'}
                  </small>
                </button>
              ))
            ) : (
              <p className="empty-state">Chưa có hồ sơ phù hợp bộ lọc hiện tại.</p>
            )}
          </div>
        </article>

        <article className="card">
          <h2>Thông tin hồ sơ</h2>
          {initiativeDetail ? (
            <div className="stack">
              <div className="overview-grid">
                <article className="overview-metric">
                  <span>Dự án</span>
                  <strong>{initiativeDetail.title}</strong>
                  <small>{initiativeDetail.department}</small>
                </article>
                <article className="overview-metric">
                  <span>Mã hồ sơ</span>
                  <strong>{initiativeDetail.code || '-'}</strong>
                  <small>{initiativeDetail.proposer_name || 'Chưa có proposer'}</small>
                </article>
                <article className="overview-metric">
                  <span>Phase hiện tại</span>
                  <strong>{initiativeOverview.currentPhaseLabel}</strong>
                  <small>{initiativeOverview.readinessLabel}</small>
                </article>
                <article className="overview-metric">
                  <span>Tiến độ</span>
                  <strong>{initiativeOverview.progressPercent}%</strong>
                  <small>{initiativeOverview.completedPhases}/6 phase hoàn tất</small>
                </article>
              </div>
              <div className="quick-strip">
                <span className="mini-pill">Proposer: {initiativeDetail.proposer_name}</span>
                <span className="mini-pill">Gate: {initiativeDetail.gate_decision || 'Chưa review'}</span>
                <span className="mini-pill">Deadline: {formatDate(initiativeDetail.target_deadline) || 'Chưa đặt'}</span>
              </div>
              <div className="actions">
                <button type="button" className="btn primary" onClick={() => openInitiativeInForm(initiativeDetail.id)}>
                  Mở trong tab Tạo dự án mới
                </button>
              </div>
              <div className="timeline compact-timeline">
                {initiativeDetail.stageHistory?.length ? (
                  initiativeDetail.stageHistory.slice(-5).reverse().map((item) => (
                    <div key={item.id} className="timeline-item">
                      <StagePill stage={item.stage} />
                      <div>
                        <strong>{item.changed_by}</strong>
                        <p>{item.note || 'Không có ghi chú'}</p>
                        <small>{new Date(item.created_at).toLocaleString('vi-VN')}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">Chưa có lịch sử chuyển phase.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="empty-state">Chọn một dự án từ danh sách bên trái để xem chi tiết.</p>
          )}
        </article>
      </div>
    </section>
  );

  const aiFormView = (
    <section className="stack">
      <SectionHeader
        title={selectedInitiativeId ? 'Tạo dự án mới / Chỉnh sửa hồ sơ AI' : 'Tạo dự án mới'}
        description="Phần điền form được tách riêng khỏi danh sách dự án để giảm nhiễu khi thao tác."
        action={
          selectedInitiativeId ? (
            <button type="button" className="btn" onClick={startNewInitiative}>
              Tạo hồ sơ trắng
            </button>
          ) : null
        }
      />

      <section className="card overview-card">
        <div className="section-head">
          <div>
            <h2>{selectedInitiativeId ? 'Form dự án AI' : 'Khởi tạo hồ sơ mới'}</h2>
            <p className="subtle">
              Màn này chỉ dành cho điền form. Danh sách dự án và bộ lọc đã được tách riêng sang tab `Danh sách dự án`.
            </p>
          </div>
          {initiativeDetail ? <StagePill stage={initiativeDetail.current_stage} /> : null}
        </div>

        <div className="overview-grid">
          <article className="overview-metric">
            <span>Dự án</span>
            <strong>{initiativeDetail?.title || 'Hồ sơ mới'}</strong>
            <small>{initiativeDetail?.department || 'Chưa xác định bộ phận'}</small>
          </article>
          <article className="overview-metric">
            <span>Mã hồ sơ</span>
            <strong>{initiativeDetail?.code || 'Sẽ tự sinh sau khi tạo'}</strong>
            <small>{initiativeDetail?.proposer_name || 'Nhập người đề xuất để bắt đầu'}</small>
          </article>
          <article className="overview-metric">
            <span>Tiến độ</span>
            <strong>{initiativeOverview.progressPercent}%</strong>
            <small>{initiativeOverview.completedPhases}/6 phase hoàn tất</small>
          </article>
          <article className="overview-metric">
            <span>Trạng thái</span>
            <strong>{initiativeOverview.readinessLabel}</strong>
            <small>{initiativeOverview.currentPhaseLabel}</small>
          </article>
        </div>

        <div className="phase-nav">
          {workflowStageItems.map(([value, label], index) => {
            const statusClass =
              activeWorkflowStage === value
                ? 'active'
                : initiativeDetail && currentStageIndex > index
                  ? 'done'
                  : '';

            return (
              <button
                key={value}
                type="button"
                className={`phase-chip ${statusClass}`.trim()}
                onClick={() => setActiveWorkflowStage(value)}
                disabled={!selectedInitiativeId && value !== 'request'}
              >
                <strong>{label}</strong>
                <span>{value}</span>
              </button>
            );
          })}
        </div>

        {initiativeDetail?.current_stage === 'no_go' ? (
          <div className="notice error">
            Hồ sơ đang ở trạng thái No-Go. Bạn vẫn có thể rà soát ARF và feasibility nhưng không thể tiếp tục triển khai các phase sau.
          </div>
        ) : null}
      </section>

      {activeWorkflowStage === 'request' ? (
        <section className="card phase-card">
          <PhaseHeader
            title="Giai đoạn 1: AI Request Form"
            description="Điền toàn bộ thông tin intake cho hồ sơ AI. Đây là form khởi tạo bắt buộc."
          />
          <form className="stack" onSubmit={submitRequestForm}>
            <div className="grid four">
              <label>
                Tên dự án
                <input name="title" value={requestForm.title} onChange={handleRequestChange} required />
              </label>
              <label>
                Bộ phận đề xuất
                <input name="department" value={requestForm.department} onChange={handleRequestChange} required />
              </label>
              <label>
                Người đề xuất
                <input name="proposerName" value={requestForm.proposerName} onChange={handleRequestChange} required />
              </label>
            </div>

            <div className="grid two">
              <label>
                Ưu tiên
                <select name="priority" value={requestForm.priority} onChange={handleRequestChange}>
                  {priorities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid four">
              <label>
                Ngày đề xuất
                <input type="date" name="requestedAt" value={requestForm.requestedAt} onChange={handleRequestChange} required />
              </label>
              <label>
                Thời gian hoàn thành dự kiến
                <input
                  type="date"
                  name="expectedCompletionDate"
                  value={requestForm.expectedCompletionDate}
                  onChange={handleRequestChange}
                />
              </label>
              <label>
                Dữ liệu sẵn có
                <select name="availableDataStatus" value={requestForm.availableDataStatus} onChange={handleRequestChange}>
                  <option value="Có">Có</option>
                  <option value="Một phần">Một phần</option>
                  <option value="Không">Không</option>
                </select>
              </label>
            </div>

            <div className="grid two">
              <label>
                Mô tả vấn đề
                <textarea name="problemStatement" rows="4" value={requestForm.problemStatement} onChange={handleRequestChange} />
              </label>
              <label>
                Pain points
                <textarea name="painPoints" rows="4" value={requestForm.painPoints} onChange={handleRequestChange} />
              </label>
            </div>

            <div className="grid two">
              <label>
                Mục tiêu kỳ vọng
                <textarea name="objective" rows="3" value={requestForm.objective} onChange={handleRequestChange} />
              </label>
              <label>
                KPI đo lường
                <textarea name="successKpi" rows="3" value={requestForm.successKpi} onChange={handleRequestChange} />
              </label>
            </div>

            <div className="grid three">
              <label>
                Người dùng cuối
                <input name="endUsers" value={requestForm.endUsers} onChange={handleRequestChange} />
              </label>
              <label>
                Tần suất sử dụng
                <input name="usageFrequency" value={requestForm.usageFrequency} onChange={handleRequestChange} />
              </label>
              <label>
                Ngân sách ước tính
                <input name="budgetEstimate" value={requestForm.budgetEstimate} onChange={handleRequestChange} />
              </label>
            </div>

            <label>
              Chi tiết dữ liệu sẵn có
              <textarea name="availableDataDetails" rows="3" value={requestForm.availableDataDetails} onChange={handleRequestChange} />
            </label>

            <label>
              Ghi chú
              <textarea name="notes" rows="3" value={requestForm.notes} onChange={handleRequestChange} />
            </label>

            <div className="actions">
              <button type="submit" className="btn primary">
                {selectedInitiativeId ? 'Lưu ARF' : 'Tạo hồ sơ AI'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {activeWorkflowStage === 'feasibility' ? (
        <section className="card phase-card">
          <PhaseHeader
            title="Giai đoạn 2: Đánh giá khả thi"
            description="Tập trung riêng feasibility và gate review, tách khỏi danh sách dự án để phần đánh giá đỡ rối hơn."
          />
          <div className="grid four">
            {[
              ['dataScore', 'Dữ liệu'],
              ['technicalScore', 'Kỹ thuật'],
              ['businessScore', 'Kinh doanh'],
              ['complianceScore', 'Tuân thủ']
            ].map(([field, label]) => (
              <label key={field}>
                {label}
                <select name={field} value={feasibilityForm[field]} onChange={handleSimpleForm(setFeasibilityForm)}>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <option key={score} value={score}>
                      {score}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="grid two">
            <label>
              Đánh giá dữ liệu
              <textarea name="dataSummary" rows="3" value={feasibilityForm.dataSummary} onChange={handleSimpleForm(setFeasibilityForm)} />
            </label>
            <label>
              Đánh giá kỹ thuật
              <textarea name="technicalSummary" rows="3" value={feasibilityForm.technicalSummary} onChange={handleSimpleForm(setFeasibilityForm)} />
            </label>
          </div>

          <div className="grid two">
            <label>
              Đánh giá kinh doanh
              <textarea name="businessSummary" rows="3" value={feasibilityForm.businessSummary} onChange={handleSimpleForm(setFeasibilityForm)} />
            </label>
            <label>
              Đánh giá tuân thủ
              <textarea name="complianceSummary" rows="3" value={feasibilityForm.complianceSummary} onChange={handleSimpleForm(setFeasibilityForm)} />
            </label>
          </div>

          <div className="actions">
            <button type="button" className="btn primary" onClick={() => submitPhase(updateFeasibility, feasibilityForm, 'Đã lưu đánh giá khả thi.')}>
              Lưu feasibility
            </button>
          </div>

          <div className="inline-card">
            <h4>Gate Review</h4>
            <div className="grid three">
              <label>
                Quyết định
                <select name="decision" value={gateForm.decision} onChange={handleSimpleForm(setGateForm)}>
                  <option value="Go">Go</option>
                  <option value="Conditional Go">Conditional Go</option>
                  <option value="No-Go">No-Go</option>
                </select>
              </label>
              <label>
                Reviewed by
                <input name="reviewedBy" value={gateForm.reviewedBy} onChange={handleSimpleForm(setGateForm)} />
              </label>
              <label>
                Điều kiện Conditional Go
                <textarea
                  name="conditionalItems"
                  rows="3"
                  value={gateForm.conditionalItems}
                  onChange={handleSimpleForm(setGateForm)}
                  placeholder="Mỗi dòng là một điều kiện"
                />
              </label>
            </div>

            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() =>
                  submitPhase(
                    submitGateReview,
                    {
                      ...gateForm,
                      conditionalItems: gateForm.conditionalItems
                        .split('\n')
                        .map((item) => item.trim())
                        .filter(Boolean)
                    },
                    'Đã cập nhật gate review.'
                  )
                }
              >
                Gửi gate review
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeWorkflowStage === 'design' ? (
        <section className="card phase-card">
          <PhaseHeader
            title="Giai đoạn 3: Thiết kế giải pháp"
            description="Màn chuyên biệt cho solution design, tập trung vào kiến trúc, tích hợp, security và milestone."
          />
          <div className="grid three">
            <label>
              Phương án
              <select name="solutionOption" value={solutionForm.solutionOption} onChange={handleSimpleForm(setSolutionForm)}>
                {solutionOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nhân sự
              <textarea name="staffingPlan" rows="3" value={solutionForm.staffingPlan} onChange={handleSimpleForm(setSolutionForm)} />
            </label>
            <label>
              Risk & mitigation
              <textarea name="risksAndMitigations" rows="3" value={solutionForm.risksAndMitigations} onChange={handleSimpleForm(setSolutionForm)} />
            </label>
          </div>

          <div className="grid two">
            <label>
              Kiến trúc hệ thống
              <textarea name="architectureSummary" rows="4" value={solutionForm.architectureSummary} onChange={handleSimpleForm(setSolutionForm)} />
            </label>
            <label>
              Yêu cầu tích hợp
              <textarea name="integrationRequirements" rows="4" value={solutionForm.integrationRequirements} onChange={handleSimpleForm(setSolutionForm)} />
            </label>
          </div>

          <div className="grid two">
            <label>
              Security layer
              <textarea name="securityRequirements" rows="4" value={solutionForm.securityRequirements} onChange={handleSimpleForm(setSolutionForm)} />
            </label>
            <label>
              Monitoring plan
              <textarea name="monitoringPlan" rows="4" value={solutionForm.monitoringPlan} onChange={handleSimpleForm(setSolutionForm)} />
            </label>
          </div>

          <label>
            Milestone plan
            <textarea name="milestonePlan" rows="3" value={solutionForm.milestonePlan} onChange={handleSimpleForm(setSolutionForm)} />
          </label>

          <div className="actions">
            <button type="button" className="btn primary" onClick={() => submitPhase(updateSolutionDesign, solutionForm, 'Đã lưu solution design.')}>
              Lưu solution design
            </button>
          </div>
        </section>
      ) : null}

      {activeWorkflowStage === 'delivery' ? (
        <section className="card phase-card">
          <PhaseHeader
            title="Giai đoạn 4: Triển khai & thử nghiệm"
            description="Theo dõi PoC, model test, UAT, security test, model card và phản hồi pilot trên cùng một phase."
          />
          <div className="grid five">
            {[
              ['pocStatus', 'PoC'],
              ['modelTestStatus', 'Model test'],
              ['uatStatus', 'UAT'],
              ['securityTestStatus', 'Security test'],
              ['modelCardStatus', 'Model card']
            ].map(([field, label]) => (
              <label key={field}>
                {label}
                <select name={field} value={deliveryForm[field]} onChange={handleSimpleForm(setDeliveryForm)}>
                  {deliveryStatuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="grid two">
            <label>
              Metrics
              <textarea name="performanceMetrics" rows="3" value={deliveryForm.performanceMetrics} onChange={handleSimpleForm(setDeliveryForm)} />
            </label>
            <label>
              Pilot feedback
              <textarea name="pilotFeedback" rows="3" value={deliveryForm.pilotFeedback} onChange={handleSimpleForm(setDeliveryForm)} />
            </label>
          </div>

          <label>
            Delivery notes
            <textarea name="deliveryNotes" rows="3" value={deliveryForm.deliveryNotes} onChange={handleSimpleForm(setDeliveryForm)} />
          </label>

          <div className="actions">
            <button type="button" className="btn primary" onClick={() => submitPhase(updateDelivery, deliveryForm, 'Đã lưu tiến độ delivery.')}>
              Lưu delivery
            </button>
          </div>
        </section>
      ) : null}

      {activeWorkflowStage === 'approval' ? (
        <section className="card phase-card">
          <PhaseHeader
            title="Giai đoạn 5: Phê duyệt & production checklist"
            description="Nhìn rõ từng lớp phê duyệt và toàn bộ checklist go-live trong một màn riêng."
          />
          <div className="grid four">
            <CheckboxField
              label="AI Governance Board"
              checked={approvalForm.governanceApproved}
              onChange={(value) => setApprovalForm((prev) => ({ ...prev, governanceApproved: value }))}
            />
            <CheckboxField
              label="Tech Lead / Architecture"
              checked={approvalForm.techApproved}
              onChange={(value) => setApprovalForm((prev) => ({ ...prev, techApproved: value }))}
            />
            <CheckboxField
              label="Legal / DPO"
              checked={approvalForm.legalApproved}
              onChange={(value) => setApprovalForm((prev) => ({ ...prev, legalApproved: value }))}
            />
            <CheckboxField
              label="Business Owner"
              checked={approvalForm.businessApproved}
              onChange={(value) => setApprovalForm((prev) => ({ ...prev, businessApproved: value }))}
            />
          </div>

          <div className="checklist-grid">
            {[
              ['performance', 'Đạt ngưỡng hiệu năng'],
              ['security', 'Security test đạt'],
              ['documentation', 'Tài liệu hoàn tất'],
              ['rollback', 'Kế hoạch rollback'],
              ['monitoring', 'Monitoring & alerting'],
              ['training', 'Đào tạo người dùng'],
              ['sla', 'SLA/SLO rõ ràng'],
              ['budget', 'Ngân sách vận hành'],
              ['incident', 'Incident response']
            ].map(([key, label]) => (
              <CheckboxField
                key={key}
                label={label}
                checked={approvalForm.checklist[key]}
                onChange={(value) => handleApprovalChecklist(key, value)}
              />
            ))}
          </div>

          <CheckboxField
            label="Ready for Go-Live"
            checked={approvalForm.readyForGoLive}
            onChange={(value) => setApprovalForm((prev) => ({ ...prev, readyForGoLive: value }))}
          />

          <label>
            Approval notes
            <textarea name="approvalNotes" rows="3" value={approvalForm.approvalNotes} onChange={handleSimpleForm(setApprovalForm)} />
          </label>

          <div className="actions">
            <button type="button" className="btn primary" onClick={() => submitPhase(updateApprovals, approvalForm, 'Đã lưu approval workflow.')}>
              Lưu approvals
            </button>
          </div>
        </section>
      ) : null}

      {activeWorkflowStage === 'operations' ? (
        <section className="card phase-card">
          <PhaseHeader
            title="Giai đoạn 6: Triển khai & vận hành"
            description="Tách riêng rollout, SLA/SLO và hoạt động vận hành liên tục để team follow-up thuận tiện hơn."
          />
          <div className="grid two">
            <label>
              Rollout strategy
              <select name="rolloutStrategy" value={operationsForm.rolloutStrategy} onChange={handleSimpleForm(setOperationsForm)}>
                {rolloutStrategies.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              SLA/SLO
              <textarea name="slaSlo" rows="3" value={operationsForm.slaSlo} onChange={handleSimpleForm(setOperationsForm)} />
            </label>
          </div>

          <div className="grid two">
            <label>
              Alerting setup
              <textarea name="alertingSetup" rows="3" value={operationsForm.alertingSetup} onChange={handleSimpleForm(setOperationsForm)} />
            </label>
            <label>
              KPI impact
              <textarea name="kpiImpact" rows="3" value={operationsForm.kpiImpact} onChange={handleSimpleForm(setOperationsForm)} />
            </label>
          </div>

          <div className="grid three">
            <label>
              Incident log
              <textarea name="incidentLog" rows="3" value={operationsForm.incidentLog} onChange={handleSimpleForm(setOperationsForm)} />
            </label>
            <label>
              Adoption plan
              <textarea name="adoptionPlan" rows="3" value={operationsForm.adoptionPlan} onChange={handleSimpleForm(setOperationsForm)} />
            </label>
            <label>
              Continuous improvement
              <textarea name="continuousImprovement" rows="3" value={operationsForm.continuousImprovement} onChange={handleSimpleForm(setOperationsForm)} />
            </label>
          </div>

          <label>
            Operational notes
            <textarea name="operationalNotes" rows="3" value={operationsForm.operationalNotes} onChange={handleSimpleForm(setOperationsForm)} />
          </label>

          <div className="actions">
            <button type="button" className="btn primary" onClick={() => submitPhase(updateOperations, operationsForm, 'Đã lưu hồ sơ vận hành.')}>
              Lưu operations
            </button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="section-head">
          <h3>Stage history</h3>
          {initiativeDetail ? (
            <button
              type="button"
              className="btn"
              onClick={() => setActiveWorkflowStage(getActiveWorkflowStage(initiativeDetail.current_stage))}
            >
              Nhảy tới phase hiện tại
            </button>
          ) : null}
        </div>
        {initiativeDetail?.stageHistory?.length ? (
          <div className="timeline">
            {initiativeDetail.stageHistory.map((item) => (
              <div key={item.id} className="timeline-item">
                <StagePill stage={item.stage} />
                <div>
                  <strong>{item.changed_by}</strong>
                  <p>{item.note || 'Không có ghi chú'}</p>
                  <small>{new Date(item.created_at).toLocaleString('vi-VN')}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">Chưa có lịch sử chuyển phase.</p>
        )}
      </section>
    </section>
  );

  let activeViewContent = homeView;
  if (activeView === 'work-dashboard') activeViewContent = workDashboardView;
  if (activeView === 'week') activeViewContent = weekManagementView;
  if (activeView === 'history') activeViewContent = historyView;
  if (activeView === 'ai-dashboard') activeViewContent = aiDashboardView;
  if (activeView === 'ai-list') activeViewContent = aiListView;
  if (activeView === 'ai-new') activeViewContent = aiFormView;

  return (
    <div className="page">
      <header className="header">
        <h1>Website quản lý vòng đời AI doanh nghiệp</h1>
        <p>
          Tách rõ 2 nhóm chức năng `Quản lý công việc` và `Dự án AI`, đồng thời thêm trang Home tổng hợp dashboard của cả hai khối.
        </p>
        <div className="header-active-tab">Mục đang xem: {activeTabLabel}</div>
      </header>

      <div className="workspace">
        <aside className="tabs">
          {menuSections.map((section) => (
            <div key={section.title || 'home'} className="menu-group">
              {section.title ? <div className="menu-group-title">{section.title}</div> : null}
              <div className="menu-list">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={activeView === item.id ? 'tab active' : 'tab'}
                    onClick={() => handleMenuClick(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <main className="content">
          {loading ? <p className="notice">Đang tải dữ liệu...</p> : null}
          {message ? <p className="notice success">{message}</p> : null}
          {error ? <p className="notice error">{error}</p> : null}
          {activeViewContent}
        </main>
      </div>
    </div>
  );
}
