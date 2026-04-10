import { useEffect, useMemo, useState } from 'react';
import {
  closeWeek,
  createAiProject,
  createTask,
  getAiDashboard,
  getAiProjects,
  getEmployees,
  getReportById,
  getReports,
  getTasks,
  removeAiProject,
  removeTask,
  updateAiProject,
  updateTask
} from './api';

const initialForm = {
  title: '',
  completedDate: '',
  priority: 'Trung bình',
  status: 'Chưa làm',
  category: '',
  note: ''
};

const initialAiForm = {
  receivedDate: '',
  proposerName: '',
  description: '',
  status: 'Đề xuất',
  employeeId: '',
  employeeName: '',
  estimatedDays: '',
  actualDays: '',
  startDate: '',
  targetEndDate: '',
  actualEndDate: ''
};

const priorities = ['Cao', 'Trung bình', 'Thấp'];
const statuses = ['Chưa làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'];
const aiStatuses = ['Đề xuất', 'Đã duyệt', 'Đang triển khai', 'Hoàn thành', 'Tạm dừng'];
const tabItems = [
  { id: 'week', label: 'Tuần hiện tại' },
  { id: 'history', label: 'Lịch sử' },
  { id: 'ai-projects', label: 'Dự án AI' },
  { id: 'ai-dashboard', label: 'Báo cáo AI' }
];

function normalizeTaskForForm(task) {
  return {
    title: task.title,
    completedDate: task.completed_date ? String(task.completed_date).slice(0, 10) : '',
    priority: task.priority,
    status: task.status,
    category: task.category,
    note: task.note || ''
  };
}

function normalizeAiProjectForForm(project) {
  return {
    receivedDate: project.received_date ? String(project.received_date).slice(0, 10) : '',
    proposerName: project.proposer_name || '',
    description: project.description || '',
    status: project.status || 'Đề xuất',
    employeeId: project.employee_id ? String(project.employee_id) : '',
    employeeName: '',
    estimatedDays: project.estimated_days ?? '',
    actualDays: project.actual_days ?? '',
    startDate: project.start_date ? String(project.start_date).slice(0, 10) : '',
    targetEndDate: project.target_end_date ? String(project.target_end_date).slice(0, 10) : '',
    actualEndDate: project.actual_end_date ? String(project.actual_end_date).slice(0, 10) : ''
  };
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  return String(value).slice(0, 10);
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeTab, setActiveTab] = useState('week');
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [aiProjects, setAiProjects] = useState([]);
  const [aiDashboard, setAiDashboard] = useState({
    kpi: { total: 0, inProgress: 0, completed: 0, paused: 0 },
    byStatus: [],
    byEmployee: []
  });
  const [aiFormData, setAiFormData] = useState(initialAiForm);
  const [aiEditingId, setAiEditingId] = useState(null);
  const [aiFilters, setAiFilters] = useState({
    status: '',
    employeeId: '',
    receivedFrom: '',
    receivedTo: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      done: tasks.filter((t) => t.status === 'Hoàn thành').length,
      inProgress: tasks.filter((t) => t.status === 'Đang làm').length,
      blocked: tasks.filter((t) => t.status === 'Tạm dừng').length,
      todo: tasks.filter((t) => t.status === 'Chưa làm').length
    };
  }, [tasks]);

  const activeAiProjects = useMemo(
    () => aiProjects.filter((project) => project.status !== 'Hoàn thành'),
    [aiProjects]
  );
  const completedAiProjects = useMemo(
    () => aiProjects.filter((project) => project.status === 'Hoàn thành'),
    [aiProjects]
  );

  const statusChartMax = useMemo(() => {
    const totals = aiDashboard.byStatus.map((item) => item.total);
    return totals.length ? Math.max(...totals) : 1;
  }, [aiDashboard.byStatus]);

  const employeeChartMax = useMemo(() => {
    const totals = aiDashboard.byEmployee.map((item) => item.total);
    return totals.length ? Math.max(...totals) : 1;
  }, [aiDashboard.byEmployee]);

  async function loadTasks() {
    const rows = await getTasks();
    setTasks(rows);
  }

  async function loadReports() {
    const rows = await getReports();
    setReports(rows);
  }

  async function loadEmployees() {
    const rows = await getEmployees();
    setEmployees(rows);
  }

  async function loadAiProjects(filters = aiFilters) {
    const rows = await getAiProjects(filters);
    setAiProjects(rows);
  }

  async function loadAiDashboard() {
    const data = await getAiDashboard();
    setAiDashboard(data);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');

      try {
        await Promise.all([
          loadTasks(),
          loadReports(),
          loadEmployees(),
          loadAiProjects(aiFilters),
          loadAiDashboard()
        ]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      if (editingId) {
        await updateTask(editingId, formData);
        setMessage('Đã cập nhật công việc.');
      } else {
        await createTask(formData);
        setMessage('Đã thêm công việc mới.');
      }

      setFormData(initialForm);
      setEditingId(null);
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(task) {
    setEditingId(task.id);
    setFormData(normalizeTaskForForm(task));
  }

  function handleCancelEdit() {
    setEditingId(null);
    setFormData(initialForm);
  }

  async function handleDelete(taskId) {
    const ok = window.confirm('Bạn chắc chắn muốn xóa công việc này?');
    if (!ok) {
      return;
    }

    setError('');
    setMessage('');

    try {
      await removeTask(taskId);
      setMessage('Đã xóa công việc.');
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCloseWeek() {
    const ok = window.confirm(
      'Sau khi chốt tuần, toàn bộ công việc tuần này sẽ chuyển vào lịch sử và reset cho tuần mới. Tiếp tục?'
    );
    if (!ok) {
      return;
    }

    setError('');
    setMessage('Đang chốt tuần...');

    try {
      await closeWeek();

      setMessage('Chốt tuần thành công. Dữ liệu đã được chuyển vào lịch sử.');
      setSelectedReport(null);

      await Promise.all([loadTasks(), loadReports()]);
      setActiveTab('history');
    } catch (err) {
      setError(err.message);
      setMessage('');
    }
  }

  async function handleOpenReport(reportId) {
    setError('');

    try {
      const detail = await getReportById(reportId);
      setSelectedReport(detail);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleAiInputChange(event) {
    const { name, value } = event.target;

    if (name === 'employeeId') {
      setAiFormData((prev) => ({ ...prev, employeeId: value, employeeName: '' }));
      return;
    }

    if (name === 'employeeName') {
      setAiFormData((prev) => ({ ...prev, employeeName: value, employeeId: '' }));
      return;
    }

    setAiFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAiSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      if (aiEditingId) {
        await updateAiProject(aiEditingId, aiFormData);
        setMessage('Đã cập nhật dự án AI.');
      } else {
        await createAiProject(aiFormData);
        setMessage('Đã thêm dự án AI mới.');
      }

      setAiFormData(initialAiForm);
      setAiEditingId(null);

      await Promise.all([loadEmployees(), loadAiProjects(aiFilters), loadAiDashboard()]);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleAiEdit(project) {
    setAiEditingId(project.id);
    setAiFormData(normalizeAiProjectForForm(project));
    setActiveTab('ai-projects');
  }

  function handleAiCancelEdit() {
    setAiEditingId(null);
    setAiFormData(initialAiForm);
  }

  async function handleAiDelete(projectId) {
    const ok = window.confirm('Bạn chắc chắn muốn xóa dự án AI này?');
    if (!ok) {
      return;
    }

    setError('');
    setMessage('');

    try {
      await removeAiProject(projectId);
      setMessage('Đã xóa dự án AI.');
      await Promise.all([loadAiProjects(aiFilters), loadAiDashboard()]);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleAiFilterChange(event) {
    const { name, value } = event.target;
    setAiFilters((prev) => ({ ...prev, [name]: value }));
  }

  async function applyAiFilters() {
    setError('');
    try {
      await loadAiProjects(aiFilters);
    } catch (err) {
      setError(err.message);
    }
  }

  async function clearAiFilters() {
    const reset = { status: '', employeeId: '', receivedFrom: '', receivedTo: '' };
    setAiFilters(reset);
    setError('');
    try {
      await loadAiProjects(reset);
    } catch (err) {
      setError(err.message);
    }
  }

  const activeTabLabel =
    tabItems.find((item) => item.id === activeTab)?.label || 'Tuần hiện tại';

  return (
    <div className="page">
      <header className="header">
        <h1>Theo dõi công việc và dự án AI</h1>
        <p>Quản lý đầu việc tuần, dự án AI theo nhân viên và theo dõi dashboard báo cáo.</p>
        <div className="header-active-tab">Mục đang xem: {activeTabLabel}</div>
      </header>

      <div className="workspace">
        <aside className="tabs">
          {tabItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeTab === item.id ? 'tab active' : 'tab'}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </aside>
        <main className="content">
          {loading ? <p className="notice">Đang tải dữ liệu...</p> : null}
          {message ? <p className="notice success">{message}</p> : null}
          {error ? <p className="notice error">{error}</p> : null}

          {activeTab === 'week' ? (
            <section className="card">
          <form className="task-form" onSubmit={handleSubmit}>
            <div className="grid two">
              <label>
                Tên công việc
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Hoàn thiện báo giá"
                  required
                />
              </label>

              <label>
                Ngày hoàn thành
                <input name="completedDate" type="date" value={formData.completedDate} onChange={handleInputChange} />
              </label>
            </div>

            <div className="grid three">
              <label>
                Ưu tiên
                <select name="priority" value={formData.priority} onChange={handleInputChange}>
                  {priorities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Trạng thái
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Loại
                <input name="category" value={formData.category} onChange={handleInputChange} placeholder="VD: Dev, họp, hỗ trợ" required />
              </label>
            </div>

            <label>
              Ghi chú
              <textarea name="note" rows="3" value={formData.note} onChange={handleInputChange} />
            </label>

            <div className="actions">
              <button type="submit" className="btn primary">
                {editingId ? 'Lưu chỉnh sửa' : 'Thêm công việc'}
              </button>

              {editingId ? (
                <button type="button" className="btn" onClick={handleCancelEdit}>
                  Hủy
                </button>
              ) : null}

              <button type="button" className="btn warning" onClick={handleCloseWeek}>
                Chốt tuần
              </button>
            </div>
          </form>

          <div className="summary">
            <span>Tổng: {summary.total}</span>
            <span>Hoàn thành: {summary.done}</span>
            <span>Đang làm: {summary.inProgress}</span>
            <span>Tạm dừng: {summary.blocked}</span>
            <span>Chưa làm: {summary.todo}</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên công việc</th>
                  <th>Ngày hoàn thành</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                  <th>Loại</th>
                  <th>Ghi chú</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty">
                      Chưa có công việc nào cho tuần hiện tại.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task, index) => (
                    <tr key={task.id}>
                      <td>{index + 1}</td>
                      <td>{task.title}</td>
                      <td>{formatDate(task.completed_date)}</td>
                      <td>{task.priority}</td>
                      <td>{task.status}</td>
                      <td>{task.category}</td>
                      <td>{task.note || '-'}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="small" onClick={() => handleEdit(task)}>
                            Sửa
                          </button>
                          <button type="button" className="small danger" onClick={() => handleDelete(task.id)}>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
            </section>
          ) : null}

          {activeTab === 'history' ? (
            <section className="card">
          <div className="history-layout">
            <div>
              <h2>Các tuần đã chốt</h2>
              <div className="report-list">
                {reports.length === 0 ? (
                  <p>Chưa có báo cáo nào.</p>
                ) : (
                  reports.map((report) => (
                    <button key={report.id} type="button" className="report-item" onClick={() => handleOpenReport(report.id)}>
                      <strong>{report.week_label}</strong>
                      <span>{new Date(report.exported_at).toLocaleString('vi-VN')}</span>
                      <span>
                        {report.completed_tasks}/{report.total_tasks} hoàn thành
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <h2>Chi tiết tuần</h2>
              {!selectedReport ? (
                <p>Chọn một tuần để xem chi tiết.</p>
              ) : (
                <div className="report-detail">
                  <p>
                    <strong>Tuần:</strong> {selectedReport.week_label}
                  </p>
                  <p>
                    <strong>Xuất lúc:</strong> {new Date(selectedReport.exported_at).toLocaleString('vi-VN')}
                  </p>
                  <p>
                    <strong>Tổng công việc:</strong> {selectedReport.total_tasks}
                  </p>
                  <p>
                    <strong>Trạng thái:</strong> Hoàn thành {selectedReport.completed_tasks} | Đang làm{' '}
                    {selectedReport.in_progress_tasks} | Tạm dừng {selectedReport.blocked_tasks} | Chưa làm{' '}
                    {selectedReport.todo_tasks}
                  </p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Tên công việc</th>
                          <th>Ngày hoàn thành</th>
                          <th>Ưu tiên</th>
                          <th>Trạng thái</th>
                          <th>Loại</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.tasks.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="empty">
                              Tuần này không có công việc.
                            </td>
                          </tr>
                        ) : (
                          selectedReport.tasks.map((task, index) => (
                            <tr key={`${task.task_id}-${index}`}>
                              <td>{index + 1}</td>
                              <td>{task.title}</td>
                              <td>{formatDate(task.completed_date)}</td>
                              <td>{task.priority}</td>
                              <td>{task.status}</td>
                              <td>{task.category}</td>
                              <td>{task.note || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
            </section>
          ) : null}

          {activeTab === 'ai-projects' ? (
            <section className="card">
          <h2>Dự án AI</h2>

          <form className="task-form" onSubmit={handleAiSubmit}>
            <div className="grid three">
              <label>
                Ngày nhận dự án
                <input name="receivedDate" type="date" value={aiFormData.receivedDate} onChange={handleAiInputChange} required />
              </label>
              <label>
                Người đề xuất dự án
                <input name="proposerName" value={aiFormData.proposerName} onChange={handleAiInputChange} required />
              </label>
              <label>
                Trạng thái
                <select name="status" value={aiFormData.status} onChange={handleAiInputChange}>
                  {aiStatuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Mô tả dự án
              <textarea name="description" rows="3" value={aiFormData.description} onChange={handleAiInputChange} required />
            </label>

            <div className="grid two">
              <label>
                Chọn nhân viên đã lưu
                <select name="employeeId" value={aiFormData.employeeId} onChange={handleAiInputChange}>
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Hoặc nhập nhân viên mới
                <input
                  name="employeeName"
                  value={aiFormData.employeeName}
                  onChange={handleAiInputChange}
                  placeholder="Nhập tên nếu chưa có trong danh sách"
                />
              </label>
            </div>

            <div className="grid five">
              <label>
                Ngày bắt đầu
                <input name="startDate" type="date" value={aiFormData.startDate} onChange={handleAiInputChange} />
              </label>
              <label>
                Ngày dự kiến kết thúc
                <input name="targetEndDate" type="date" value={aiFormData.targetEndDate} onChange={handleAiInputChange} />
              </label>
              <label>
                Ngày kết thúc thực tế
                <input name="actualEndDate" type="date" value={aiFormData.actualEndDate} onChange={handleAiInputChange} />
              </label>
              <label>
                Thời gian dự kiến (ngày)
                <input name="estimatedDays" type="number" min="0" value={aiFormData.estimatedDays} onChange={handleAiInputChange} />
              </label>
              <label>
                Thời gian thực tế (ngày)
                <input name="actualDays" type="number" min="0" value={aiFormData.actualDays} onChange={handleAiInputChange} />
              </label>
            </div>

            <div className="actions">
              <button type="submit" className="btn primary">
                {aiEditingId ? 'Lưu dự án AI' : 'Thêm dự án AI'}
              </button>
              {aiEditingId ? (
                <button type="button" className="btn" onClick={handleAiCancelEdit}>
                  Hủy
                </button>
              ) : null}
            </div>
          </form>

          <div className="filters">
            <h3>Bộ lọc dự án AI</h3>
            <div className="grid four">
              <label>
                Trạng thái
                <select name="status" value={aiFilters.status} onChange={handleAiFilterChange}>
                  <option value="">Tất cả</option>
                  {aiStatuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nhân viên
                <select name="employeeId" value={aiFilters.employeeId} onChange={handleAiFilterChange}>
                  <option value="">Tất cả</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ngày nhận từ
                <input type="date" name="receivedFrom" value={aiFilters.receivedFrom} onChange={handleAiFilterChange} />
              </label>
              <label>
                Ngày nhận đến
                <input type="date" name="receivedTo" value={aiFilters.receivedTo} onChange={handleAiFilterChange} />
              </label>
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={applyAiFilters}>
                Áp dụng lọc
              </button>
              <button type="button" className="btn" onClick={clearAiFilters}>
                Xóa lọc
              </button>
            </div>
          </div>

          <h3>Đang theo dõi</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Ngày nhận</th>
                  <th>Người đề xuất</th>
                  <th>Mô tả</th>
                  <th>Nhân viên</th>
                  <th>Trạng thái</th>
                  <th>Thời gian (ngày)</th>
                  <th>Mốc thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {activeAiProjects.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty">
                      Không có dự án AI đang theo dõi.
                    </td>
                  </tr>
                ) : (
                  activeAiProjects.map((project, index) => (
                    <tr key={project.id}>
                      <td>{index + 1}</td>
                      <td>{formatDate(project.received_date)}</td>
                      <td>{project.proposer_name}</td>
                      <td>{project.description}</td>
                      <td>{project.employee_name}</td>
                      <td>{project.status}</td>
                      <td>
                        Dự kiến: {project.estimated_days ?? '-'}<br />
                        Thực tế: {project.actual_days ?? '-'}
                      </td>
                      <td>
                        BĐ: {formatDate(project.start_date)}<br />
                        DKKT: {formatDate(project.target_end_date)}<br />
                        KT: {formatDate(project.actual_end_date)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="small" onClick={() => handleAiEdit(project)}>
                            Sửa
                          </button>
                          <button type="button" className="small danger" onClick={() => handleAiDelete(project.id)}>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3>Đã hoàn thành</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Ngày nhận</th>
                  <th>Người đề xuất</th>
                  <th>Mô tả</th>
                  <th>Nhân viên</th>
                  <th>Trạng thái</th>
                  <th>Thời gian (ngày)</th>
                  <th>Mốc thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {completedAiProjects.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty">
                      Chưa có dự án AI hoàn thành.
                    </td>
                  </tr>
                ) : (
                  completedAiProjects.map((project, index) => (
                    <tr key={project.id}>
                      <td>{index + 1}</td>
                      <td>{formatDate(project.received_date)}</td>
                      <td>{project.proposer_name}</td>
                      <td>{project.description}</td>
                      <td>{project.employee_name}</td>
                      <td>{project.status}</td>
                      <td>
                        Dự kiến: {project.estimated_days ?? '-'}<br />
                        Thực tế: {project.actual_days ?? '-'}
                      </td>
                      <td>
                        BĐ: {formatDate(project.start_date)}<br />
                        DKKT: {formatDate(project.target_end_date)}<br />
                        KT: {formatDate(project.actual_end_date)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="small" onClick={() => handleAiEdit(project)}>
                            Sửa
                          </button>
                          <button type="button" className="small danger" onClick={() => handleAiDelete(project.id)}>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
            </section>
          ) : null}

          {activeTab === 'ai-dashboard' ? (
            <section className="card">
          <h2>Báo cáo AI</h2>

          <div className="kpi-grid">
            <div className="kpi-card">
              <strong>{aiDashboard.kpi.total}</strong>
              <span>Tổng dự án</span>
            </div>
            <div className="kpi-card">
              <strong>{aiDashboard.kpi.inProgress}</strong>
              <span>Đang triển khai</span>
            </div>
            <div className="kpi-card">
              <strong>{aiDashboard.kpi.completed}</strong>
              <span>Hoàn thành</span>
            </div>
            <div className="kpi-card">
              <strong>{aiDashboard.kpi.paused}</strong>
              <span>Tạm dừng</span>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="chart-card">
              <h3>Biểu đồ theo trạng thái</h3>
              {aiDashboard.byStatus.length === 0 ? (
                <p>Chưa có dữ liệu.</p>
              ) : (
                aiDashboard.byStatus.map((item) => (
                  <div key={item.status} className="bar-row">
                    <span className="bar-label">{item.status}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${Math.max(8, (item.total / statusChartMax) * 100)}%` }}
                      />
                    </div>
                    <span className="bar-value">{item.total}</span>
                  </div>
                ))
              )}
            </div>

            <div className="chart-card">
              <h3>Biểu đồ theo nhân viên</h3>
              {aiDashboard.byEmployee.length === 0 ? (
                <p>Chưa có dữ liệu.</p>
              ) : (
                aiDashboard.byEmployee.map((item) => (
                  <div key={item.employee_name} className="bar-row">
                    <span className="bar-label">{item.employee_name}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill secondary"
                        style={{ width: `${Math.max(8, (item.total / employeeChartMax) * 100)}%` }}
                      />
                    </div>
                    <span className="bar-value">{item.total}</span>
                  </div>
                ))
              )}
            </div>
          </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
