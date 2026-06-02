import { Request, Response } from "express";
import Session from "../models/session.model";
import crypto from "crypto";

export const getSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await Session.find()
      .populate("hr_id", "name email")
      .sort({ createdAt: -1 });

    res.json({ data: sessions });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { title, candidate_name, candidate_email, questions } = req.body;

    const room_code = crypto.randomBytes(4).toString("hex").toUpperCase();

    const newSession = await Session.create({
      title,
      hr_id: req.user!.id,
      candidate_name,
      candidate_email,
      questions: questions || [],
      room_code,
    });

    res.status(201).json({ data: newSession });
  } catch (error) {
    res.status(500).json({ message: "Failed to create session" });
  }
};

export const getSessionByRoomCode = async (req: Request, res: Response) => {
  try {
    const { room_code } = req.params;

    const session = await Session.findOne({ room_code }).populate("questions");

    if (!session) {
      return res.status(404).json({ message: "Interview room not found" });
    }

    res.json({ data: session });
  } catch (error) {
    res.status(500).json({ message: "Failed to join room" });
  }
};

export const updateSessionStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedSession = await Session.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedSession) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json({ data: updatedSession });
  } catch (error) {
    res.status(500).json({ message: "Failed to update session status" });
  }
};