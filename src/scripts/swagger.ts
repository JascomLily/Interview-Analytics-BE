import swaggerAutogen from 'swagger-autogen';
import { env } from '../config/env';

const doc = {
  openapi: '3.0.0',
  info: {
    title: 'Interview Analytics API',
    description: 'Tài liệu API được tự động sinh (Auto-generated) cho toàn bộ hệ thống Backend.',
    version: '1.0.0'
  },
  servers: [
    {
      url: `http://localhost:${env.PORT || 8000}`,
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

// Chạy hàm generate
swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc).then(() => {
    console.log("Đã tạo thành công file Swagger chứa toàn bộ API!");
});
