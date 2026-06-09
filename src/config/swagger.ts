import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Interview Analytics API',
      version: '1.0.0',
      description: 'Tài liệu API chuyên nghiệp cho dự án Phỏng vấn thông minh tích hợp AI.',
      contact: {
        name: 'Developer',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT || 8000}`,
        description: 'Local server',
      },
      {
        url: 'https://interview-analytics-be.onrender.com', // Thay url tuỳ ý
        description: 'Production server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập JWT Token lấy từ API Login',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    // Tự động quét các comment JSDoc trong các file route để ghép vào Swagger UI
    // (Bên dưới là cấu trúc tĩnh mẫu cho một số luồng chính để bạn test luôn, không cần viết comment)
    paths: {
      '/api/auth/login': {
        post: {
          summary: 'Đăng nhập hệ thống',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', example: 'hr@example.com' },
                    password: { type: 'string', example: '123456' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Đăng nhập thành công, trả về Access Token' }
          }
        }
      },
      '/api/sessions': {
        get: {
          summary: 'Lấy danh sách các phiên phỏng vấn',
          tags: ['Interview Sessions'],
          responses: { 200: { description: 'Danh sách phiên' } }
        },
        post: {
          summary: 'Tạo phòng phỏng vấn mới',
          tags: ['Interview Sessions'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    job_position_id: { type: 'string' },
                    candidate_profile_id: { type: 'string' },
                    scheduled_at: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          responses: { 201: { description: 'Tạo phòng thành công' } }
        }
      },
      '/api/sessions/{id}/status': {
        put: {
          summary: 'Cập nhật trạng thái phòng phỏng vấn (Kích hoạt AI)',
          tags: ['Interview Sessions'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'COMPLETED' } }
                }
              }
            }
          },
          responses: { 200: { description: 'Đã cập nhật trạng thái và kích hoạt hàng đợi AI' } }
        }
      },
      '/api/recordings/upload': {
        post: {
          summary: 'Upload file ghi âm câu trả lời',
          tags: ['Recordings (AI Pipeline)'],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    audio: { type: 'string', format: 'binary', description: 'File WebM/WAV' },
                    session_id: { type: 'string' },
                    question_id: { type: 'string' },
                    user_role: { type: 'string', example: 'CANDIDATE' },
                    start_time: { type: 'number' },
                    end_time: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Đã nhận file, trạng thái PENDING chờ AI xử lý' } }
        }
      },
      '/api/reports/{sessionId}/export-pdf': {
        get: {
          summary: 'Tải Báo cáo Phỏng vấn dưới dạng PDF',
          tags: ['Reports & AI Dashboard'],
          parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'File PDF luồng stream tải xuống trực tiếp' } }
        }
      }
    }
  },
  // Tuỳ chọn quét thêm JSDoc (Nếu sau này bạn viết comment vào file Routes)
  apis: ['./src/routes/*.ts'], 
};

export const swaggerSpec = swaggerJsdoc(options);
