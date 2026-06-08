import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Import toàn bộ Model chuẩn theo ERD
import Role from "../models/role.model";
import User from "../models/user.model";
import Skill from "../models/skill.model";
import JobPosition from "../models/job-position.model";
import CandidateProfile from "../models/candidate-profile.model";
import QuestionCategory from "../models/question-category.model";
import QuestionBank from "../models/question-bank.model";
import InterviewSession from "../models/interview-session.model";
import SessionQuestion from "../models/session-question.model";
import InterviewInvitation from "../models/interview-invitation.model";

const seedDatabase = async () => {
    try {
        // 1. Kết nối Database
        console.log("⏳ Đang kết nối tới MongoDB...");
        await mongoose.connect(env.MONGODB_URI);
        console.log("✅ Kết nối thành công!");

        // 2. Xóa sạch dữ liệu cũ để tránh lỗi trùng lặp (Clean up)
        console.log("🧹 Đang dọn dẹp dữ liệu cũ...");
        await Promise.all([
            Role.deleteMany({}), User.deleteMany({}), Skill.deleteMany({}),
            JobPosition.deleteMany({}), CandidateProfile.deleteMany({}),
            QuestionCategory.deleteMany({}), QuestionBank.deleteMany({}),
            InterviewSession.deleteMany({}), SessionQuestion.deleteMany({}),
            InterviewInvitation.deleteMany({})
        ]);

        // 3. TẠO ROLE (HR, CANDIDATE, ADMIN)
        console.log("🌱 Đang tạo Roles...");
        const roles = await Role.insertMany([
            { name: "ADMIN", permissions: ["ALL"] },
            { name: "HR", permissions: ["MANAGE_INTERVIEW"] },
            { name: "CANDIDATE", permissions: ["JOIN_INTERVIEW"] }
        ]);
        const hrRole = roles.find(r => r.name === "HR");

        // 4. TẠO USER HR
        console.log("👤 Đang tạo tài khoản HR...");
        const password_hash = await bcrypt.hash("123456", 10);
        const hrUser = await User.create({
            name: "Nguyễn Văn HR",
            email: "hr@company.com",
            password_hash,
            role_id: hrRole!._id
        });

        // 5. TẠO KỸ NĂNG VÀ VỊ TRÍ CÔNG VIỆC
        console.log("💼 Đang tạo Job Position và Skills...");
        const skillReact = await Skill.create({ name: "ReactJS" });
        const jobPosition = await JobPosition.create({
            title: "Frontend Developer",
            department: "Engineering",
            required_skills: [skillReact._id]
        });

        // 6. TẠO ỨNG VIÊN
        console.log("🧑‍💻 Đang tạo Candidate Profile...");
        const candidate = await CandidateProfile.create({
            owner_id: hrUser._id,
            full_name: "Trần Văn Ứng Viên",
            email: "ungvien@gmail.com"
        });

        // 7. TẠO DANH MỤC VÀ NGÂN HÀNG CÂU HỎI
        console.log("📚 Đang tạo Question Bank...");
        const category = await QuestionCategory.create({ name: "Chuyên môn Frontend" });
        const question1 = await QuestionBank.create({
            category_id: category._id,
            assessed_skills: [skillReact._id],
            content: "Hãy phân biệt sự khác nhau giữa Virtual DOM và Real DOM trong React?",
            expected_answer: "Virtual DOM là bản sao nhẹ của Real DOM trên memory. React dùng nó để tính toán sự thay đổi (diffing) và chỉ cập nhật những phần thực sự thay đổi lên Real DOM, giúp tối ưu hiệu suất."
        });

        // 8. TẠO BUỔI PHỎNG VẤN (MÔ PHỎNG LUỒNG CỦA SESSION CONTROLLER)
        console.log("🔥 Đang khởi tạo buổi phỏng vấn & Magic Link...");
        const room_code = crypto.randomBytes(4).toString("hex").toUpperCase();

        const session = await InterviewSession.create({
            conductor_id: hrUser._id,
            job_position_id: jobPosition._id,
            candidate_profile_id: candidate._id,
            room_code: room_code
        });

        // Clone câu hỏi
        await SessionQuestion.create({
            session_id: session._id,
            question_bank_id: question1._id,
            content: question1.content,
            expected_answer: question1.expected_answer,
            order_index: 1
        });

        // Gen Magic Link Token
        const magicLinkPayload = {
            session_id: session._id,
            candidate_id: candidate._id,
            room_code: room_code
        };
        const magicLinkToken = jwt.sign(magicLinkPayload, env.JWT_ACCESS_SECRET, { expiresIn: "7d" });

        // Tạo Invitation
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + 7);
        await InterviewInvitation.create({
            session_id: session._id,
            magic_link_token: magicLinkToken,
            expires_at
        });

        console.log("\n=======================================================");
        console.log("🎉 KHỞI TẠO DỮ LIỆU THÀNH CÔNG!");
        console.log(`- Tài khoản HR test: hr@company.com / pass: 123456`);
        console.log(`- Mã phòng phỏng vấn: ${room_code}`);
        console.log(`- 🔗 MAGIC LINK CHO ỨNG VIÊN: ${env.CLIENT_URL}/interview/join?token=${magicLinkToken}`);
        console.log("=======================================================\n");

        process.exit(0); // Tắt script sau khi chạy xong
    } catch (error) {
        console.error("❌ Lỗi khi nạp dữ liệu:", error);
        process.exit(1);
    }
};

seedDatabase();