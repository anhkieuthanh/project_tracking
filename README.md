# Theo Doi Cong Viec Tuan + Du An AI

Website gom 2 module:
- Theo dõi công việc tuần
- Theo dõi dự án AI cho nhân viên

## Module 1: Công việc tuần

Các trường:
- Tên công việc
- Ngày hoàn thành
- Mức độ ưu tiên
- Trạng thái
- Phân loại
- Ghi chú

Có nút **Chốt tuần** để:
1. Chuyển toàn bộ task sang lịch sử
2. Reset danh sách task cho tuần mới

## Module 2: Dự án AI

Các trường:
- Ngày nhận dự án
- Người đề xuất dự án
- Mô tả dự án
- Trạng thái
- Thời gian thực hiện (mốc thời gian + số ngày)
- Nhân viên phụ trách

Tính năng:
- Tách riêng khu `Đang theo dõi` và `Đã hoàn thành`
- Lọc theo trạng thái, nhân viên, khoảng ngày nhận
- Dashboard báo cáo theo trạng thái và nhân viên

## 1) Chuẩn bị

Yêu cầu:
- Node.js 18+
- Docker (để chạy PostgreSQL)

Khởi động database:

```bash
docker compose up -d
```

## 2) Chạy backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend chạy ở `http://localhost:4000`.

## 3) Chạy frontend

Mở terminal mới:

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy ở `http://localhost:5173`.

## 4) Luồng sử dụng nhanh

1. Quản lý công việc ở tab **Tuần hiện tại** và **Lịch sử**.
2. Quản lý dự án ở tab **Dự án AI**.
3. Xem tổng quan ở tab **Báo cáo AI**.

## API chính

- `GET /tasks`
- `POST /tasks`
- `PUT /tasks/:id`
- `DELETE /tasks/:id`
- `POST /reports/export`
- `GET /reports`
- `GET /reports/:id`
- `GET /employees`
- `POST /employees`
- `GET /ai-projects`
- `POST /ai-projects`
- `PUT /ai-projects/:id`
- `DELETE /ai-projects/:id`
- `GET /ai-projects/dashboard/summary`
