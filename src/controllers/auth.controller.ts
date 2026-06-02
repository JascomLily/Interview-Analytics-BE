import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model";
import {
  generateTokenPair,
  verifyRefreshToken,
} from "../utils/jwt.utils";

const SALT_ROUNDS = 10;

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name,
      email,
      password_hash,
      role: role || "CANDIDATE",
    });

    const tokens = generateTokenPair(user.id, user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(201).json({
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const tokens = generateTokenPair(user.id, user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const payload = verifyRefreshToken(token);

    const user = await User.findOne({ _id: payload.id, refreshToken: token, isActive: true });
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const tokens = generateTokenPair(user.id, user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ message: "Failed to get user info" });
  }
};
