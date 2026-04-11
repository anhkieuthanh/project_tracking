# Quy Trình Tiếp Nhận Yêu Cầu Đến Triển Khai Ứng Dụng AI Trong Doanh Nghiệp

> **Mục tiêu:** Chuẩn hóa toàn bộ vòng đời dự án AI — từ khi nhận yêu cầu từ các bộ phận cho đến khi ứng dụng AI vận hành ổn định và tạo giá trị đo lường được.

---

## Tổng quan quy trình

```
[Giai đoạn 1] Tiếp nhận & xác định yêu cầu
        ↓
[Giai đoạn 2] Đánh giá tính khả thi  →  Gate review: Go / No-Go
        ↓ (Go)
[Giai đoạn 3] Thiết kế giải pháp AI
        ↓
[Giai đoạn 4] Phát triển & thử nghiệm  ↺ (vòng lặp phản hồi)
        ↓
[Giai đoạn 5] Phê duyệt & kiểm soát rủi ro  →  Production checklist
        ↓
[Giai đoạn 6] Triển khai & vận hành liên tục
        ↓
    Ứng dụng AI vận hành ổn định & tạo giá trị
        ↑___________________________(Vòng lặp cải tiến liên tục)
```

---

## Giai đoạn 1 — Tiếp nhận & xác định yêu cầu

### 1.1 Thu thập yêu cầu

**Hình thức:**
- Phỏng vấn 1-1 với stakeholder từng bộ phận
- Workshop nhóm (design thinking / problem framing)
- Khảo sát nội bộ về điểm đau (pain points)

**Thông tin cần thu thập:**
- Vấn đề kinh doanh cần giải quyết là gì?
- Quy trình hiện tại đang thực hiện như thế nào?
- Kỳ vọng đầu ra và tiêu chí thành công
- Người dùng cuối và tần suất sử dụng
- Các ràng buộc về thời gian và ngân sách

### 1.2 Phân loại & ưu tiên

Sử dụng **Ma trận Tác động / Nỗ lực** để ưu tiên:

| Mức ưu tiên | Tác động | Nỗ lực | Hành động |
|-------------|----------|--------|-----------|
| **Cao nhất** | Cao | Thấp | Triển khai ngay |
| **Cao** | Cao | Cao | Lên kế hoạch chi tiết |
| **Trung bình** | Thấp | Thấp | Triển khai khi có nguồn lực |
| **Thấp** | Thấp | Cao | Xem xét lại hoặc bỏ qua |

**Phân loại use case AI theo nhóm:**
- Tự động hóa quy trình (RPA + AI)
- Phân tích & dự báo (Predictive Analytics)
- Tương tác người dùng (Chatbot, Virtual Assistant)
- Nhận diện & phân loại (Computer Vision, NLP)
- Hỗ trợ quyết định (Decision Support)

### 1.3 Tài liệu hóa — AI Request Form (ARF)

Mỗi yêu cầu cần được ghi chép vào **AI Request Form** bao gồm:

```
AI Request Form (ARF)
─────────────────────────────────────────
Tên dự án        : ___________________
Bộ phận đề xuất  : ___________________
Ngày đề xuất     : ___________________
Người chịu trách nhiệm: ______________

Mô tả vấn đề     : ___________________
Mục tiêu kỳ vọng : ___________________
KPI đo lường     : ___________________
Thời hạn mong muốn: __________________
Ngân sách ước tính: __________________

Dữ liệu sẵn có   : Có / Không / Một phần
Mức độ ưu tiên   : Cao / Trung bình / Thấp
─────────────────────────────────────────
```

---

## Giai đoạn 2 — Đánh giá tính khả thi

### 2.1 Đánh giá dữ liệu

- Nguồn dữ liệu có sẵn và chất lượng (đầy đủ, sạch, đủ lớn?)
- Quyền sở hữu và quyền truy cập dữ liệu
- Nhu cầu thu thập / làm sạch dữ liệu bổ sung
- Tính nhạy cảm và phân loại dữ liệu (PII, bí mật kinh doanh)

### 2.2 Đánh giá kỹ thuật

- Hạ tầng hiện có (cloud, on-premise, hybrid)
- Khả năng tích hợp với hệ thống hiện tại (ERP, CRM, API)
- Năng lực đội ngũ kỹ thuật nội bộ
- Yêu cầu về hiệu năng, độ trễ, độ sẵn sàng (SLA)

### 2.3 Đánh giá kinh doanh

- Ước tính ROI (tiết kiệm chi phí / tăng doanh thu / tăng năng suất)
- Chi phí triển khai và vận hành (CAPEX / OPEX)
- Thời gian hoàn vốn (payback period)
- Rủi ro kinh doanh nếu không triển khai

### 2.4 Đánh giá tuân thủ & đạo đức AI

- Quy định pháp lý áp dụng (PDPA, GDPR, quy định ngành)
- Kiểm tra thiên kiến (bias) tiềm ẩn trong mô hình
- Tính minh bạch và giải thích được (Explainability)
- Chính sách bảo mật thông tin và an ninh mạng

### 2.5 Gate Review — Go / No-Go

Sau khi hoàn thành 4 chiều đánh giá, hội đồng ra quyết định:

| Kết quả | Điều kiện | Hành động tiếp theo |
|---------|-----------|---------------------|
| **Go** | Đủ điều kiện cả 4 chiều | Chuyển sang Giai đoạn 3 |
| **Conditional Go** | Cần bổ sung điều kiện | Giải quyết vướng mắc trước khi tiếp tục |
| **No-Go** | Không khả thi hoặc rủi ro cao | Từ chối hoặc tạm hoãn, ghi nhận lý do |

---

## Giai đoạn 3 — Thiết kế giải pháp AI

### 3.1 Lựa chọn phương án mô hình

| Phương án | Khi nào phù hợp | Ưu điểm | Nhược điểm |
|-----------|-----------------|---------|------------|
| **Build** (tự phát triển) | Use case độc đáo, dữ liệu riêng | Kiểm soát tối đa | Chi phí cao, thời gian dài |
| **Buy** (mua giải pháp) | Use case phổ biến, cần nhanh | Nhanh, ít rủi ro | Phụ thuộc vendor |
| **Fine-tune** | Có base model, cần tùy chỉnh | Cân bằng chi phí/hiệu quả | Cần dữ liệu training |
| **RAG** | Cần tra cứu tài liệu nội bộ | Cập nhật dễ, ít hallucination | Cần thiết kế pipeline tốt |
| **API / Third-party** | Tính năng đơn giản, prototype | Nhanh nhất, chi phí thấp ban đầu | Chi phí tăng theo scale |

### 3.2 Thiết kế kiến trúc hệ thống

Các thành phần cần thiết kế:

- **Data pipeline:** Thu thập → Xử lý → Lưu trữ → Serving
- **Model serving:** REST API, batch inference, stream inference
- **Integration layer:** Kết nối với hệ thống hiện có
- **Security layer:** Authentication, authorization, encryption
- **Monitoring layer:** Logging, alerting, dashboard

### 3.3 Kế hoạch dự án

- Phân chia sprint / milestone rõ ràng
- Phân công nguồn lực (AI Engineer, Data Scientist, DevOps, PM, Business Analyst)
- KPI thành công tại mỗi checkpoint
- Kế hoạch rủi ro và phương án dự phòng
- Timeline tổng thể và ngày go-live dự kiến

---

## Giai đoạn 4 — Phát triển & thử nghiệm

### 4.1 PoC / Prototype

- Xây dựng phiên bản tối giản để kiểm chứng ý tưởng
- Demo cho stakeholder để xác nhận hướng đi
- Thu thập phản hồi sớm trước khi đầu tư đầy đủ

### 4.2 Kiểm thử mô hình

**Các chỉ số cần kiểm tra:**

| Nhóm | Chỉ số |
|------|--------|
| **Hiệu năng** | Accuracy, Precision, Recall, F1-Score, AUC-ROC |
| **Vận hành** | Latency (P50/P95/P99), Throughput, Memory usage |
| **Chất lượng** | Hallucination rate, Consistency, Robustness |
| **Công bằng** | Bias across demographic groups, Fairness metrics |

### 4.3 Pilot / UAT (User Acceptance Testing)

- Chọn nhóm người dùng thực tế để thử nghiệm
- Thiết lập môi trường staging gần giống production
- Thu thập phản hồi định lượng và định tính
- Vòng lặp: Phản hồi → Cải thiện → Thử nghiệm lại

### 4.4 Kiểm tra bảo mật

- Penetration testing trên hệ thống AI
- Privacy audit (kiểm tra rò rỉ dữ liệu cá nhân)
- Adversarial attack testing (prompt injection, model poisoning)
- Vulnerability assessment

### 4.5 Tài liệu & Model Card

Mỗi mô hình cần có **Model Card** ghi rõ:
- Mục đích và phạm vi sử dụng
- Dữ liệu training (nguồn, quy mô, thời gian)
- Hiệu năng trên các tập test
- Giới hạn và trường hợp không nên dùng
- Thông tin về thiên kiến đã phát hiện

---

## Giai đoạn 5 — Phê duyệt & kiểm soát rủi ro

### 5.1 Các bên phê duyệt

| Bên phê duyệt | Nội dung phê duyệt |
|---------------|---------------------|
| **AI Governance Board** | Chính sách sử dụng AI, đạo đức, tuân thủ nội bộ |
| **Tech Lead / Architecture** | Kiến trúc hệ thống, bảo mật, hiệu năng |
| **Legal / DPO** | Tuân thủ pháp lý, bảo vệ dữ liệu cá nhân (PDPA) |
| **Business Owner** | Phê duyệt ngân sách, xác nhận mục tiêu kinh doanh |

### 5.2 Production Checklist — Sẵn sàng Go-Live

```
□ Mô hình đạt ngưỡng hiệu năng tối thiểu đã thỏa thuận
□ Kiểm thử bảo mật hoàn thành, không có lỗ hổng nghiêm trọng
□ Tài liệu hệ thống và Model Card đã hoàn thiện
□ Kế hoạch rollback đã được kiểm tra
□ Hệ thống monitoring và alerting đã cấu hình
□ Đào tạo người dùng đã lên kế hoạch
□ SLA và SLO đã được định nghĩa rõ ràng
□ Tất cả 4 bên phê duyệt đã ký off
□ Ngân sách vận hành được phê duyệt
□ Kế hoạch xử lý sự cố (incident response) đã có
```

---

## Giai đoạn 6 — Triển khai & vận hành liên tục

### 6.1 Chiến lược Rollout

| Chiến lược | Mô tả | Phù hợp khi |
|------------|-------|-------------|
| **Shadow Mode** | Chạy song song, không ảnh hưởng production | Kiểm chứng an toàn lần cuối |
| **Canary Release** | Thả cho ~5-10% người dùng trước | Rủi ro cao, cần kiểm chứng thực tế |
| **Blue-Green** | Chuyển đổi toàn bộ, giữ môi trường cũ dự phòng | Cần rollback nhanh |
| **Feature Flag** | Bật/tắt tính năng theo nhóm người dùng | Kiểm soát linh hoạt |

### 6.2 Đào tạo & Adoption

- Tổ chức buổi đào tạo cho người dùng cuối
- Xây dựng tài liệu hướng dẫn sử dụng (user guide)
- Thiết lập kênh hỗ trợ (helpdesk, FAQ)
- Chương trình change management để tăng adoption rate
- Thu thập phản hồi thường xuyên từ người dùng

### 6.3 MLOps & Monitoring

**Các chỉ số cần theo dõi liên tục:**

| Nhóm | Chỉ số | Tần suất kiểm tra |
|------|--------|-------------------|
| **Model performance** | Accuracy drift, prediction distribution | Hàng ngày |
| **Hệ thống** | Latency, error rate, availability | Real-time |
| **Kinh doanh** | KPI impact, user adoption | Hàng tuần |
| **Dữ liệu** | Data quality, data drift | Hàng ngày |

**Thiết lập alert khi:**
- Hiệu năng mô hình giảm quá ngưỡng cho phép (model drift)
- Tỷ lệ lỗi tăng đột biến
- Latency vượt ngưỡng SLA
- Phát hiện dữ liệu bất thường (data anomaly)

### 6.4 Đo lường KPI & Business Impact

Đánh giá định kỳ (hàng tháng / quý):
- So sánh KPI trước và sau triển khai AI
- Tính toán ROI thực tế so với dự báo
- Thu thập NPS / satisfaction score từ người dùng
- Báo cáo cho ban lãnh đạo

### 6.5 Xử lý sự cố (Incident Response)

```
Phát hiện sự cố
      ↓
Đánh giá mức độ nghiêm trọng (P1/P2/P3)
      ↓
Thông báo đội ngũ liên quan
      ↓
Khắc phục hoặc Rollback (nếu P1)
      ↓
Post-mortem & cải tiến quy trình
```

### 6.6 Cải tiến liên tục

- Lên lịch **retraining** định kỳ khi phát hiện drift
- Cập nhật mô hình với dữ liệu mới
- Mở rộng phạm vi (scale out) khi nhu cầu tăng
- Đưa phản hồi thực tế trở lại Giai đoạn 1 để khởi động chu kỳ cải tiến tiếp theo

---

## Các vai trò & trách nhiệm

| Vai trò | Trách nhiệm chính |
|---------|-------------------|
| **AI Project Manager** | Điều phối toàn bộ quy trình, quản lý timeline & rủi ro |
| **Business Analyst** | Thu thập yêu cầu, xây dựng ARF, đo lường KPI |
| **Data Scientist / ML Engineer** | Xây dựng, huấn luyện, đánh giá mô hình |
| **Data Engineer** | Xây dựng pipeline dữ liệu, đảm bảo chất lượng dữ liệu |
| **MLOps / DevOps Engineer** | Triển khai, monitoring, CI/CD cho mô hình AI |
| **Security Engineer** | Kiểm tra bảo mật, pen testing |
| **Legal / DPO** | Đảm bảo tuân thủ pháp lý và bảo vệ dữ liệu |
| **AI Governance Lead** | Giám sát đạo đức AI, chính sách sử dụng |
| **Business Owner** | Phê duyệt, cung cấp ngân sách và định hướng chiến lược |

---

## Công cụ & tài liệu kèm theo

| Tài liệu | Mô tả | Giai đoạn |
|----------|-------|-----------|
| AI Request Form (ARF) | Mẫu tiếp nhận yêu cầu chuẩn hóa | Giai đoạn 1 |
| Feasibility Assessment | Báo cáo đánh giá khả thi 4 chiều | Giai đoạn 2 |
| Solution Design Document | Tài liệu thiết kế kiến trúc | Giai đoạn 3 |
| Model Card | Hồ sơ mô hình AI | Giai đoạn 4 |
| Production Checklist | Danh sách kiểm tra trước go-live | Giai đoạn 5 |
| Runbook | Hướng dẫn vận hành và xử lý sự cố | Giai đoạn 6 |

---

*Tài liệu này được xây dựng dựa trên các thực tiễn tốt nhất (best practices) trong triển khai AI doanh nghiệp và có thể được điều chỉnh phù hợp với quy mô, ngành nghề và mức độ trưởng thành AI của từng tổ chức.*
