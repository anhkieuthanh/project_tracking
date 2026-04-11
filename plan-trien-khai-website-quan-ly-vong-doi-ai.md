# Plan triển khai website quản lý vòng đời AI doanh nghiệp

## Mục tiêu sản phẩm

Xây dựng website quản lý tập trung cho toàn bộ vòng đời triển khai AI trong doanh nghiệp, từ tiếp nhận nhu cầu đến vận hành liên tục. Sản phẩm được triển khai trên stack hiện có `React + Express + PostgreSQL`, giữ nguyên module công việc tuần và thay toàn bộ module dự án AI cũ bằng workflow 6 giai đoạn.

## Mapping 6 giai đoạn sang module hệ thống

| Giai đoạn nghiệp vụ | Module hệ thống | Dữ liệu chính |
|---|---|---|
| 1. Tiếp nhận & xác định yêu cầu | AI Request Form | tiêu đề, bộ phận, owner, pain points, KPI, deadline, dữ liệu sẵn có |
| 2. Đánh giá khả thi | Feasibility + Gate Review | 4 chiều đánh giá, score, nhận xét, quyết định Go/Conditional Go/No-Go |
| 3. Thiết kế giải pháp | Solution Design | phương án Build/Buy/Fine-tune/RAG/API, kiến trúc, tích hợp, security, monitoring, milestone |
| 4. Phát triển & thử nghiệm | Delivery Cycle | PoC, model test, UAT, security test, model card, metrics, pilot feedback |
| 5. Phê duyệt & kiểm soát rủi ro | Approval Workflow | 4 nhóm phê duyệt, production checklist, ready for go-live |
| 6. Triển khai & vận hành liên tục | Operations Record | rollout strategy, SLA/SLO, alerting, KPI impact, incident log, continuous improvement |

## Backlog triển khai theo milestone

### Milestone 1
- Tạo schema `ai_initiatives` và các bảng phase riêng.
- Tạo API trung tâm cho request form, feasibility và stage history.
- Thêm validation nghiệp vụ cho ARF và gate review.

### Milestone 2
- Refactor frontend sang danh sách hồ sơ + chi tiết hồ sơ.
- Xây stepper 6 phase.
- Hoàn thiện UI cho giai đoạn 1-3.

### Milestone 3
- Bổ sung UI/API cho delivery, approvals và operations.
- Thêm production checklist và điều kiện ready-for-go-live.
- Thêm dashboard điều hành cho phase, owner, decision và deadline.

### Milestone 4
- Viết test tích hợp backend.
- Viết smoke test frontend.
- Cập nhật tài liệu README và hướng dẫn sử dụng.

## Schema và API dự kiến

### Schema chính
- `ai_initiatives`
- `request_forms`
- `feasibility_reviews`
- `solution_designs`
- `delivery_cycles`
- `approval_records`
- `operations_records`
- `initiative_stage_history`

### API
- `GET/POST /ai-initiatives`
- `GET/PUT /ai-initiatives/:id`
- `GET/PUT /ai-initiatives/:id/request-form`
- `GET/PUT /ai-initiatives/:id/feasibility`
- `POST /ai-initiatives/:id/gate-review`
- `GET/PUT /ai-initiatives/:id/solution-design`
- `GET/PUT /ai-initiatives/:id/delivery`
- `GET/PUT /ai-initiatives/:id/approvals`
- `GET/PUT /ai-initiatives/:id/operations`
- `GET /ai-initiatives/dashboard/summary`

## Tiêu chí nghiệm thu

- Tạo mới hồ sơ AI bằng ARF hợp lệ.
- Không cho đi tiếp nếu phase trước chưa đủ dữ liệu bắt buộc.
- `No-Go` chặn luồng sang thiết kế và triển khai nhưng vẫn truy xuất được hồ sơ.
- Chỉ cho `Ready for Go-Live` khi đủ checklist và đủ 4 nhóm phê duyệt.
- Dashboard phản ánh đúng phase, decision, owner và hồ sơ nearing deadline.
- Module công việc tuần vẫn hoạt động độc lập, không bị ảnh hưởng bởi refactor AI workflow.
