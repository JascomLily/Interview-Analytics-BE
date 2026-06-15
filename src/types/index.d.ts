export interface JwtPayload {
    id: string;
    role: string;
}

export interface RoomParticipant {
    userId: string;
    socketId: string;
    role: string;
    joinedAt: Date;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
            candidate?: {
                id: string;
                session_id: string;
                room_code: string;
            };
        }
    }
}