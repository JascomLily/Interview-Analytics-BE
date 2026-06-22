import puppeteer from "puppeteer";
import ejs from "ejs";

const reportTemplate = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Báo cáo Phỏng vấn - <%= session_info.candidate_profile_id.full_name %></title>
    <style>
        body { font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; padding: 40px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #2980b9; margin-top: 30px; }
        .header-info { margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .header-info p { margin: 5px 0; }
        .score-box { background: #e8f4f8; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .score-box h3 { margin: 0; color: #2980b9; font-size: 24px; }
        .question-card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; page-break-inside: avoid; }
        .q-title { font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
        .q-score { float: right; color: #e74c3c; font-weight: bold; }
        .feedback { background: #fdfefe; border-left: 4px solid #f1c40f; padding: 10px; margin: 10px 0; font-style: italic; }
        .strengths { color: #27ae60; }
        .weaknesses { color: #c0392b; }
    </style>
</head>
<body>
    <h1>BÁO CÁO KẾT QUẢ PHỎNG VẤN</h1>
    
    <div class="header-info">
        <p><strong>Ứng viên:</strong> <%= session_info.candidate_profile_id.full_name %> (<%= session_info.candidate_profile_id.email %>)</p>
        <p><strong>Mã phòng:</strong> <%= session_info.room_code %></p>
        <p><strong>Ngày phỏng vấn:</strong> <%= new Date(session_info.scheduled_at).toLocaleString('vi-VN') %></p>
    </div>

    <div class="score-box">
        <h3>ĐIỂM ĐÁNH GIÁ TỔNG QUAN: <%= metrics.average_score %> / 100</h3>
        <p>Số câu hỏi đã trả lời: <%= metrics.total_questions %> | Đã chấm: <%= metrics.evaluated_questions %></p>
    </div>

    <h2>Chi tiết từng câu hỏi</h2>
    <% detailed_results.forEach(function(item, index) { %>
        <div class="question-card">
            <div class="q-title">
                Câu <%= index + 1 %>: <%= item.question_content %>
                <span class="q-score">Điểm: <%= item.evaluation ? item.evaluation.score : 'Chưa có' %>/100</span>
            </div>
            
            <p><strong>Ứng viên trả lời:</strong> <%= item.candidate_transcript || '(Không thu được âm thanh)' %></p>
            
            <% if (item.evaluation) { %>
                <div class="feedback">
                    <strong>Nhận xét AI:</strong> <%= item.evaluation.feedback %>
                </div>
                
                <% if (item.evaluation.strengths && item.evaluation.strengths.length > 0) { %>
                    <p class="strengths"><strong>Điểm mạnh:</strong> 
                        <ul>
                        <% item.evaluation.strengths.forEach(function(s) { %>
                            <li><%= s %></li>
                        <% }); %>
                        </ul>
                    </p>
                <% } %>
                
                <% if (item.evaluation.weaknesses && item.evaluation.weaknesses.length > 0) { %>
                    <p class="weaknesses"><strong>Cần cải thiện:</strong> 
                        <ul>
                        <% item.evaluation.weaknesses.forEach(function(w) { %>
                            <li><%= w %></li>
                        <% }); %>
                        </ul>
                    </p>
                <% } %>
            <% } else { %>
                <p><em>(Câu hỏi này chưa có kết quả đánh giá từ AI)</em></p>
            <% } %>
        </div>
    <% }); %>

</body>
</html>
`;

export const generatePdfBuffer = async (reportData: any): Promise<Buffer> => {
    // Render HTML từ template EJS
    const htmlContent = ejs.render(reportTemplate, reportData);

    let browser;
    const isProd = process.env.NODE_ENV === "production" || !!process.env.RENDER;

    if (isProd) {
        // Trên Render / Production: sử dụng Chromium tải kèm từ @sparticuz/chromium
        const chromium = require("@sparticuz/chromium");
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
    } else {
        // Ở môi trường local: dùng Chromium mặc định của Puppeteer
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        });
    }

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();

    return Buffer.from(pdfBuffer);
};
