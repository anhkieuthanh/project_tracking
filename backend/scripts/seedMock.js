import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/weekly_tracking'
});

const mockTasks = [
  {
    title: 'Hoàn thiện giao diện tab Lịch sử',
    completedDate: '2026-04-08',
    priority: 'Cao',
    status: 'Hoàn thành',
    category: 'Frontend',
    note: 'Đã fix responsive trên mobile'
  },
  {
    title: 'Tích hợp API xuất PDF báo cáo tuần',
    completedDate: '2026-04-09',
    priority: 'Cao',
    status: 'Đang làm',
    category: 'Backend',
    note: 'Đang tinh chỉnh format file PDF'
  },
  {
    title: 'Họp thống nhất scope sprint với team',
    completedDate: '2026-04-10',
    priority: 'Trung bình',
    status: 'Chưa làm',
    category: 'Meeting',
    note: 'Chờ xác nhận lịch họp từ PM'
  },
  {
    title: 'Review pull request module lịch sử công việc',
    completedDate: '2026-04-09',
    priority: 'Trung bình',
    status: 'Hoàn thành',
    category: 'Code Review',
    note: 'Đã comment 3 mục cần tối ưu'
  },
  {
    title: 'Cập nhật tài liệu hướng dẫn sử dụng hệ thống',
    completedDate: '2026-04-11',
    priority: 'Thấp',
    status: 'Tạm dừng',
    category: 'Documentation',
    note: 'Tạm dừng do chưa chốt UI cuối'
  },
  {
    title: 'Xử lý bug validation trường ngày hoàn thành',
    completedDate: '2026-04-09',
    priority: 'Cao',
    status: 'Hoàn thành',
    category: 'Bugfix',
    note: 'Đã bổ sung test case edge date'
  },
  {
    title: 'Hỗ trợ user import danh sách công việc cũ',
    completedDate: '2026-04-10',
    priority: 'Trung bình',
    status: 'Đang làm',
    category: 'Support',
    note: 'Đang kiểm tra format file đầu vào'
  },
  {
    title: 'Tối ưu tốc độ truy vấn danh sách task',
    completedDate: '2026-04-12',
    priority: 'Thấp',
    status: 'Chưa làm',
    category: 'Performance',
    note: ''
  }
];

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM tasks');

    for (const task of mockTasks) {
      await client.query(
        `INSERT INTO tasks (title, completed_date, priority, status, category, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          task.title,
          task.completedDate,
          task.priority,
          task.status,
          task.category,
          task.note
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`Đã nạp ${mockTasks.length} công việc mẫu cho tuần hiện tại.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed mock data:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
