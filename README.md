# 🎙️ Interview Analytics - Backend API

Đây là mã nguồn Backend cho hệ thống **Interview Analytics** – Nền tảng phỏng vấn và đánh giá ứng viên thông minh tích hợp AI (RAG & Speech-to-Text). 

Hệ thống cung cấp các API xử lý luồng dữ liệu thời gian thực, quản lý âm thanh kép (Dual-track recording), bóc băng ghi âm và đánh giá câu trả lời tự động dựa trên Vector Search.

## 🚀 Công nghệ sử dụng (Tech Stack)

* **Runtime:** Node.js
* **Framework:** Express.js
* **Ngôn ngữ:** TypeScript
* **Cơ sở dữ liệu:** MongoDB (quản lý qua Mongoose)
* **Kiến trúc:** RESTful API, Decoupled Architecture

## 🌟 Các Module cốt lõi (Core Features)

Dự án được thiết kế để phục vụ các luồng nghiệp vụ sau:
* **Quản lý phiên phỏng vấn:** Khởi tạo `Interview_ID`, phòng họp bảo mật và xác thực người dùng (HR / Interviewee).
* **Knowledge Base (RAG Setup):** Lưu trữ bộ câu hỏi, tiêu chí đánh giá (Rubrics) và tạo Embedding Vector cho các câu trả lời mẫu.
* **Audio Processing:** Nhận và lưu trữ file ghi âm độc lập từ luồng HR và luồng Ứng viên (Dual-track).
* **Speech-to-Text (STT):** Gọi service bóc băng ghi âm và đồng bộ hóa timestamps.
* **AI Evaluation:** So sánh câu trả lời thực tế với Expected Answer (Vector Search) để tự động chấm điểm nội dung.

## ⚙️ Hướng dẫn cài đặt và chạy dự án (Local Development)

### 1. Yêu cầu hệ thống (Prerequisites)
* Node.js (Phiên bản v20 trở lên)
* Tài khoản MongoDB Atlas hoặc MongoDB Local
* Git

### 2. Cài đặt thư viện
Clone dự án về máy và cài đặt các gói phụ thuộc:
```bash
git clone https://github.com/JascomLily/Interview-Analytics-BE.git
cd Interview-Analytics-BE
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env` ở thư mục gốc và cung cấp các thông tin sau:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/interview_analytics_db?retryWrites=true&w=majority
```

### 4. Khởi động Server
Chạy lệnh sau để bật môi trường Development (tự động reload khi có thay đổi code):
```bash
npm run dev
```
Server sẽ chạy tại: `http://localhost:5000`

## 📁 Cấu trúc thư mục (Project Structure)
```text
Interview-Analytics-BE/
├── src/
│   ├── config/        # Cấu hình kết nối (Database,...)
│   ├── models/        # Các Mongoose Schema (User, Question, Session...)
│   ├── index.ts       # File entry khởi chạy server
├── .env               # Biến môi trường (Không push lên Git)
├── package.json       # Quản lý thư viện
└── tsconfig.json      # Cấu hình TypeScript
```

## 🤝 Thành viên phát triển
* **Khuong Duy** - Backend Developer