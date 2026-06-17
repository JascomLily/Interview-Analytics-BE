import swaggerAutogen from 'swagger-autogen';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';

const doc = {
  openapi: '3.0.0',
  info: {
    title: 'Interview Analytics API',
    description: 'Tài liệu API được tự động sinh (Auto-generated) cho toàn bộ hệ thống Backend.',
    version: '1.0.0'
  },
  servers: [
    {
      url: `http://localhost:${env.PORT || 5000}`,
      description: 'Local server',
    },
    {
      url: 'https://interview-analytics-be.onrender.com',
      description: 'Production server',
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const outputFile = '../config/swagger_output.json';
const endpointsFiles = ['../index.ts'];

const apiDetails: Record<string, string> = {
  // Auth
  "post_/api/v1/auth/register": "Đăng ký tài khoản mới",
  "post_/api/v1/auth/login": "Đăng nhập vào hệ thống",
  "post_/api/v1/auth/refresh": "Cấp lại Access Token bằng Refresh Token",
  "post_/api/v1/auth/logout": "Đăng xuất khỏi hệ thống",
  "get_/api/v1/auth/me": "Lấy thông tin cá nhân của người dùng hiện tại",
  
  // Users
  "get_/api/v1/users/": "Lấy danh sách người dùng (Phân trang)",
  "delete_/api/v1/users/{id}": "Xoá người dùng theo ID",

  // Job Positions
  "get_/api/v1/job-positions/": "Lấy danh sách vị trí tuyển dụng",
  "get_/api/v1/job-positions/{id}": "Lấy thông tin vị trí tuyển dụng theo ID",
  "post_/api/v1/job-positions/": "Tạo vị trí tuyển dụng mới",
  "put_/api/v1/job-positions/{id}": "Cập nhật vị trí tuyển dụng",
  "delete_/api/v1/job-positions/{id}": "Xoá vị trí tuyển dụng",

  // Candidates
  "get_/api/v1/candidates/": "Lấy danh sách ứng viên",
  "get_/api/v1/candidates/{id}": "Lấy hồ sơ ứng viên theo ID",
  "post_/api/v1/candidates/": "Tạo hồ sơ ứng viên mới",
  "put_/api/v1/candidates/{id}": "Cập nhật thông tin ứng viên",
  "delete_/api/v1/candidates/{id}": "Xoá ứng viên",

  // Skills & Categories
  "get_/api/v1/skills/": "Lấy danh sách kỹ năng",
  "post_/api/v1/skills/": "Thêm kỹ năng mới",
  "delete_/api/v1/skills/{id}": "Xoá kỹ năng",
  "get_/api/v1/categories/": "Lấy danh sách danh mục câu hỏi",
  "post_/api/v1/categories/": "Tạo danh mục mới",
  "delete_/api/v1/categories/{id}": "Xoá danh mục",

  // Questions
  "get_/api/v1/questions/": "Lấy danh sách câu hỏi trong ngân hàng",
  "post_/api/v1/questions/": "Thêm câu hỏi mới vào ngân hàng",
  "delete_/api/v1/questions/{id}": "Xoá câu hỏi",
  "post_/api/v1/questions/import-pdf": "Nhập danh sách câu hỏi từ file PDF (Parse PDF)",
  "post_/api/v1/questions/vector-search": "Tìm kiếm câu hỏi bằng Vector (RAG test)",

  // Knowledge Base
  "get_/api/v1/knowledge/": "Lấy danh sách tài liệu trí tuệ (Knowledge Documents)",
  "post_/api/v1/knowledge/upload": "Upload tài liệu PDF/DOCX để hệ thống AI học (Vector Embeddings)",
  "delete_/api/v1/knowledge/{id}": "Xóa tài liệu tri thức và dữ liệu vector RAG liên quan",

  // Sessions
  "get_/api/v1/sessions/": "Lấy danh sách các phiên phỏng vấn",
  "post_/api/v1/sessions/": "Tạo phòng phỏng vấn mới (Snapshot câu hỏi)",
  "get_/api/v1/sessions/room/{room_code}": "Lấy thông tin phòng phỏng vấn bằng Mã Phòng (Room Code)",
  "put_/api/v1/sessions/{id}/status": "Cập nhật trạng thái phòng phỏng vấn (Kích hoạt AI đánh giá)",
  "post_/api/v1/sessions/{id}/send-invitation": "Gửi email lời mời phỏng vấn cho ứng viên",
  "post_/api/v1/sessions/{id}/follow-up-question": "AI tạo câu hỏi tiếp nối (Follow-up) theo thời gian thực",

  // Recordings
  "post_/api/v1/recordings/upload": "Upload file âm thanh phỏng vấn của ứng viên (WebRTC)",

  // Reports
  "get_/api/v1/reports/": "Lấy dữ liệu tổng quan cho Dashboard Báo cáo",
  "get_/api/v1/reports/{sessionId}": "Xem chi tiết báo cáo đánh giá của AI cho một phiên phỏng vấn",
  "post_/api/v1/reports/{sessionId}/re-evaluate": "Yêu cầu AI chấm điểm lại phiên phỏng vấn (Tạo Version mới)",
  "get_/api/v1/reports/{sessionId}/export-pdf": "Xuất báo cáo kết quả phỏng vấn dưới dạng file PDF"
};

// Chạy hàm generate
swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc).then(() => {
    const outPath = path.resolve(__dirname, outputFile);
    const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));

    // Tự động gán Tag dựa theo route path (ví dụ /api/v1/auth -> Auth)
    for (const [routePath, methodsObj] of Object.entries(data.paths)) {
        let tag = "Khác";
        if (routePath.includes('/auth')) tag = "1. Auth";
        else if (routePath.includes('/users')) tag = "2. Users";
        else if (routePath.includes('/job-positions')) tag = "3. Job Positions";
        else if (routePath.includes('/candidates')) tag = "4. Candidates";
        else if (routePath.includes('/skills')) tag = "5. Skills";
        else if (routePath.includes('/categories')) tag = "6. Categories";
        else if (routePath.includes('/questions')) tag = "7. Questions Bank";
        else if (routePath.includes('/knowledge')) tag = "8. AI Knowledge Base (RAG)";
        else if (routePath.includes('/sessions')) tag = "9. Interview Sessions";
        else if (routePath.includes('/recordings')) tag = "10. Audio Recordings";
        else if (routePath.includes('/reports')) tag = "11. AI Evaluation Reports";

        const methods: any = methodsObj;
        for (const method in methods) {
            methods[method].tags = [tag];
            
            // Gán giải thích (summary) cho API
            const key = `${method}_${routePath}`;
            if (apiDetails[key]) {
                methods[method].summary = apiDetails[key];
            } else {
                methods[method].summary = `${method.toUpperCase()} ${routePath}`;
            }
        }
    }

    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.log("Đã tạo và gắn mô tả (Summary) thành công cho file Swagger chứa 41 API!");
});
