import type { Request, Response, NextFunction } from "express";
import { verifyIdToken } from "../services/firebase-admin";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name: string;
  };
}

export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No authentication token provided" });
    }

    const idToken = authHeader.replace("Bearer ", "");
    const decodedToken = await verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      name: decodedToken.name || decodedToken.email?.split("@")[0] || "User",
    };

    next();
  } catch (error: any) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Invalid authentication token" });
  }
}
