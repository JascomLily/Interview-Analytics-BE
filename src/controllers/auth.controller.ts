import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model";
import Role from "../models/role.model";
import { generateTokenPair, verifyRefreshToken } from "../utils/jwt.utils";

const SALT_ROUNDS = 10;

const setRefreshTokenCookie = (res: Response, token: string) => {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, roleName } = req.body; // Dùng roleName thay vì role

        if (!name || !email || !password) {
            res.status(400).json({ message: "Name, email and password are required" });
            return;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(409).json({ message: "Email already exists" });
            return;
        }

        // TÌM ROLE_ID TỪ BẢNG ROLE
        const roleDoc = await Role.findOne({ name: roleName || "CANDIDATE" });
        if (!roleDoc) {
            res.status(400).json({ message: "Role không hợp lệ. Hãy đảm bảo DB đã có dữ liệu Role." });
            return;
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await User.create({
            name,
            email,
            password_hash,
            role_id: roleDoc._id, // Lưu ID thay vì string
        });

        const tokens = generateTokenPair(user.id, roleDoc.name);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        setRefreshTokenCookie(res, tokens.refreshToken);

        res.status(201).json({
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: roleDoc.name
                },
                accessToken: tokens.accessToken,
            },
        });
    } catch (error) {
        console.error("[Register Error]", error);
        res.status(500).json({ message: "Registration failed" });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required" });
            return;
        }

        // POPULATE ROLE ĐỂ LẤY TÊN
        const user: any = await User.findOne({ email, isActive: true }).populate("role_id");
        if (!user) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }

        const roleName = user.role_id ? user.role_id.name : "CANDIDATE";
        const tokens = generateTokenPair(user.id, roleName);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        setRefreshTokenCookie(res, tokens.refreshToken);

        res.json({
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: roleName,
                    avatarUrl: user.avatarUrl
                },
                accessToken: tokens.accessToken,
            },
        });
    } catch (error) {
        console.error("[Login Error]", error);
        res.status(500).json({ message: "Login failed" });
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.cookies?.refreshToken;

        if (!token) {
            res.status(401).json({ message: "Refresh token is required in cookies" });
            return;
        }

        const payload = verifyRefreshToken(token);

        const user: any = await User.findOne({ _id: payload.id, refreshToken: token, isActive: true }).populate("role_id");
        if (!user) {
            res.status(401).json({ message: "Invalid refresh token" });
            return;
        }

        const roleName = user.role_id ? user.role_id.name : "CANDIDATE";
        const tokens = generateTokenPair(user.id, roleName);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        setRefreshTokenCookie(res, tokens.refreshToken);

        res.json({
            data: { accessToken: tokens.accessToken },
        });
    } catch {
        res.status(401).json({ message: "Invalid or expired refresh token" });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }

        await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
        const isProd = process.env.NODE_ENV === "production";
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax"
        });

        res.json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: "Logout failed" });
    }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }

        const user: any = await User.findById(req.user.id).populate("role_id", "name");
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json({
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role_id?.name,
                avatarUrl: user.avatarUrl,
                isActive: user.isActive
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to get user info" });
    }
};