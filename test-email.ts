import { EmailService } from "./src/services/email.service";

async function test() {
    try {
        console.log("Đang kết nối tới máy chủ Google SMTP...");
        await EmailService.sendMagicLink("bolao3324@gmail.com", "Tester", "http://test.com", new Date());
        console.log("✅ GỬI EMAIL THÀNH CÔNG!");
    } catch (e: any) {
        console.error("❌ THẤT BẠI:", e.message);
    }
}
test();
