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
    const fs = require('fs');
    const path = require('path');
    const outPath = path.resolve(__dirname, outputFile);
    const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));

    // Tự động gán Tag dựa theo route path (ví dụ /api/v1/auth -> Auth)
    for (const [routePath, methodsObj] of Object.entries(data.paths)) {
        let tag = "Khác";
        if (routePath.includes('/auth')) tag = "Auth";
        else if (routePath.includes('/users')) tag = "Users";
        else if (routePath.includes('/job-positions')) tag = "Job Positions";
        else if (routePath.includes('/candidates')) tag = "Candidates";
        else if (routePath.includes('/skills')) tag = "Skills";
        else if (routePath.includes('/categories')) tag = "Categories";
        else if (routePath.includes('/sessions')) tag = "Sessions";
        else if (routePath.includes('/questions')) tag = "Questions";
        else if (routePath.includes('/knowledge')) tag = "Knowledge Base (RAG)";
        else if (routePath.includes('/recordings')) tag = "Recordings (AI Pipeline)";
        else if (routePath.includes('/reports')) tag = "Reports";

        const methods: any = methodsObj;
        for (const method in methods) {
            methods[method].tags = [tag];
        }
    }

    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.log("Đã tạo và phân rã Tag thành công cho file Swagger chứa 41 API!");
});
