# Website quản lý vòng đời AI doanh nghiệp

Website gồm 2 khối chức năng:
- Quản lý công việc tuần
- Quản lý full lifecycle triển khai AI doanh nghiệp theo 6 giai đoạn

## Khối 1: Công việc tuần

Giữ nguyên các tính năng:
- CRUD công việc tuần
- Chốt tuần để chuyển task sang lịch sử
- Xem snapshot báo cáo đã chốt

## Khối 2: Vòng đời AI doanh nghiệp

Thay thế hoàn toàn module `Dự án AI` cũ bằng workflow mới:
- Giai đoạn 1: AI Request Form
- Giai đoạn 2: Đánh giá khả thi + Gate Review
- Giai đoạn 3: Thiết kế giải pháp
- Giai đoạn 4: Triển khai & thử nghiệm
- Giai đoạn 5: Phê duyệt & checklist go-live
- Giai đoạn 6: Rollout & vận hành

Tính năng chính:
- Danh sách hồ sơ AI có filter theo phase, owner, priority, decision, khoảng ngày
- Trang chi tiết hồ sơ với stepper 6 phase
- Ghi nhận stage history
- Dashboard điều hành theo phase, decision, owner, backlog phê duyệt, nearing deadline

## Chuẩn bị

Yêu cầu:
- Node.js 18+
- Docker để chạy PostgreSQL

Khởi động database:

```bash
docker compose up -d
```

## Chạy backend

```bash
cd backend
npm install
npm run dev
```

Backend chạy ở `http://localhost:4000`.

## Chạy frontend

Mở terminal mới:

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy ở `http://localhost:5173`.

## API chính

### Weekly tracking
- `GET /tasks`
- `POST /tasks`
- `PUT /tasks/:id`
- `DELETE /tasks/:id`
- `POST /reports/export`
- `GET /reports`
- `GET /reports/:id`
- `GET /employees`
- `POST /employees`

### AI lifecycle
- `GET /ai-initiatives`
- `POST /ai-initiatives`
- `GET /ai-initiatives/:id`
- `PUT /ai-initiatives/:id`
- `GET /ai-initiatives/:id/request-form`
- `PUT /ai-initiatives/:id/request-form`
- `GET /ai-initiatives/:id/feasibility`
- `PUT /ai-initiatives/:id/feasibility`
- `POST /ai-initiatives/:id/gate-review`
- `GET /ai-initiatives/:id/solution-design`
- `PUT /ai-initiatives/:id/solution-design`
- `GET /ai-initiatives/:id/delivery`
- `PUT /ai-initiatives/:id/delivery`
- `GET /ai-initiatives/:id/approvals`
- `PUT /ai-initiatives/:id/approvals`
- `GET /ai-initiatives/:id/operations`
- `PUT /ai-initiatives/:id/operations`
- `GET /ai-initiatives/dashboard/summary`

## Luồng sử dụng nhanh

1. Quản lý đầu việc ở tab `Tuần hiện tại` và `Lịch sử`.
2. Tạo hồ sơ AI mới tại tab `Vòng đời AI`.
3. Hoàn thiện lần lượt ARF, feasibility, gate review, solution design, delivery, approvals và operations.
4. Theo dõi portfolio ở tab `Dashboard điều hành`.
