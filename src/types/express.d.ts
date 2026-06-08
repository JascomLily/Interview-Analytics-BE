import { Express } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role_id: string;
        roleName?: string; 
      };
    }
  }
}