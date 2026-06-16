import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || "smtp.gmail.com",
    port: Number(env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
});

export const EmailService = {
    sendMagicLink: async (toEmail: string, candidateName: string, magicUrl: string, scheduledAt: Date) => {
        const mailOptions = {
            from: `"Interview System" <${env.SMTP_USER || "no-reply@interview.com"}>`,
            to: toEmail,
            subject: "Thư Mời Phỏng Vấn (Kèm Liên Kết Truy Cập)",
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2>Chào ${candidateName},</h2>
                    <p>Bạn đã được mời tham gia một buổi phỏng vấn trực tuyến trên hệ thống của chúng tôi.</p>
                    <p><strong>Thời gian dự kiến:</strong> ${new Date(scheduledAt).toLocaleString("vi-VN")}</p>
                    <p>Để tham gia buổi phỏng vấn, vui lòng nhấn vào đường link bảo mật dưới đây (Magic Link):</p>
                    <p>
                        <a href="${magicUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                            Bấm vào đây để tham gia
                        </a>
                    </p>
                    <p><i>Lưu ý: Link này là duy nhất và được gắn với tài khoản của bạn. Vui lòng không chia sẻ cho người khác. Link sẽ hết hạn sau 7 ngày.</i></p>
                    <br>
                    <p>Trân trọng,<br>Đội ngũ HR</p>
                </div>
            `,
        };

        try {
            if (!env.SMTP_USER || !env.SMTP_PASS) {
                throw new Error("Missing SMTP credentials");
            }
            const info = await transporter.sendMail(mailOptions);
            console.log("[EmailService] Message sent: %s", info.messageId);
            return true;
        } catch (error) {
            console.error("[EmailService] Error sending email:", error);
            throw new Error("Không thể gửi email");
        }
    }
};
