import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { env } from "./env";
import { verifyAccessToken } from "../utils/jwt.utils";
import { JwtPayload, RoomParticipant } from "../types";
import InterviewSession from "../models/interview-session.model";
import http from "http";
import { processAudioChunk } from "../services/transcription.service";

const rooms = new Map<string, RoomParticipant[]>();

const getRoom = (roomCode: string): RoomParticipant[] => {
    if (!rooms.has(roomCode)) {
        rooms.set(roomCode, []);
    }
    return rooms.get(roomCode)!;
};

const removeParticipant = (roomCode: string, socketId: string): RoomParticipant | undefined => {
    const participants = rooms.get(roomCode);
    if (!participants) return undefined;

    const index = participants.findIndex((p) => p.socketId === socketId);
    if (index === -1) return undefined;

    const [removed] = participants.splice(index, 1);

    if (participants.length === 0) {
        rooms.delete(roomCode);
    }

    return removed;
};

const findRoomBySocketId = (socketId: string): string | undefined => {
    for (const [roomCode, participants] of rooms) {
        if (participants.some((p) => p.socketId === socketId)) {
            return roomCode;
        }
    }
    return undefined;
};

export const initializeSocket = (httpServer: HttpServer): Server => {
    const io = new Server(httpServer, {
        cors: {
            origin: env.CLIENT_URL,
            methods: ["GET", "POST"],
        },
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error("Authentication required"));
        }

        try {
            const payload: JwtPayload = verifyAccessToken(token);
            socket.data.user = payload;
            next();
        } catch {
            next(new Error("Invalid or expired token"));
        }
    });

    io.on("connection", (socket: Socket) => {

        const user: JwtPayload = socket.data.user;

        socket.on("room:join", async (data: { roomCode: string }) => {
            try {
                const { roomCode } = data;

                const session = await InterviewSession.findOne({ room_code: roomCode });
                if (!session) {
                    return socket.emit("room:error", { message: "Interview room not found" });
                }

                if (session.status === "COMPLETED" || session.status === "CANCELLED") {
                    return socket.emit("room:error", { message: "This interview session has ended" });
                }

                const participants = getRoom(roomCode);
                const alreadyJoined = participants.some((p) => p.userId === user.id);
                if (alreadyJoined) {
                    return socket.emit("room:error", { message: "Already in this room" });
                }

                socket.join(roomCode);

                participants.push({
                    userId: user.id,
                    socketId: socket.id,
                    role: user.role,
                    joinedAt: new Date(),
                });

                io.to(roomCode).emit("room:user-joined", {
                    userId: user.id,
                    role: user.role,
                    participants: participants.map(({ userId, role }) => ({ userId, role })),
                });
            } catch {
                socket.emit("room:error", { message: "Failed to join room" });
            }
        });

        socket.on("room:leave", (data: { roomCode: string }) => {
            const { roomCode } = data;
            handleLeaveRoom(socket, io, roomCode);
        });

        socket.on("recording:start", (data: { roomCode: string; questionId: string }) => {
            const { roomCode, questionId } = data;

            if (user.role !== "HR") {
                return socket.emit("room:error", { message: "Only HR can control recording" });
            }

            io.to(roomCode).emit("recording:started", {
                questionId,
                startedBy: user.id,
                startedAt: new Date().toISOString(),
            });
        });

        socket.on("recording:stop", (data: { roomCode: string; questionId: string }) => {
            const { roomCode, questionId } = data;

            if (user.role !== "HR") {
                return socket.emit("room:error", { message: "Only HR can control recording" });
            }

            io.to(roomCode).emit("recording:stopped", {
                questionId,
                stoppedBy: user.id,
                stoppedAt: new Date().toISOString(),
            });
        });

        socket.on("question:next", (data: { roomCode: string; questionIndex: number }) => {
            const { roomCode, questionIndex } = data;

            if (user.role !== "HR") {
                return socket.emit("room:error", { message: "Only HR can navigate questions" });
            }

            io.to(roomCode).emit("question:changed", {
                questionIndex,
                changedBy: user.id,
            });
        });
        socket.on("audio:stream", async (data: { roomCode: string; audioChunk: Buffer; questionId: string }) => {
            const { roomCode, audioChunk, questionId } = data;


            if (user.role !== "CANDIDATE") {
                return socket.emit("room:error", { message: "Chỉ ứng viên mới được quyền gửi âm thanh" });
            }

            try {

                const chunkText = await processAudioChunk(audioChunk);

                if (chunkText && chunkText.trim().length > 0) {
                    io.to(roomCode).emit("audio:transcription", {
                        questionId,
                        text: chunkText,
                        userId: user.id
                    });
                }
            } catch (err) {
                console.error("[Socket Audio Error]", err);
            }
        });

        socket.on("disconnect", () => {
            const roomCode = findRoomBySocketId(socket.id);
            if (roomCode) {
                handleLeaveRoom(socket, io, roomCode);
            }
        });
    });

    return io;
};

const handleLeaveRoom = (socket: Socket, io: Server, roomCode: string) => {
    const removed = removeParticipant(roomCode, socket.id);
    if (!removed) return;

    socket.leave(roomCode);

    const remaining = rooms.get(roomCode) || [];

    io.to(roomCode).emit("room:user-left", {
        userId: removed.userId,
        role: removed.role,
        participants: remaining.map(({ userId, role }) => ({ userId, role })),
    });
};
