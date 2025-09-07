// server/auth.ts
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import admin from "firebase-admin";

// Initialize Firebase admin if not already
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// Extend Express Request with user
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string | null;
    name?: string | null;
  };
}

// Middleware to authenticate user
export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    let user = await storage.getUserByFirebaseUid(decodedToken.uid);

    if (!user) {
      // Create user in storage if doesn't exist
      user = await storage.createUser({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || null,
        name: decodedToken.name || null,
        createdAt: new Date(),
      });
    }

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
    };

    next();
  } catch (err) {
    console.error("Authentication failed:", err);
    res.status(401).json({ message: "Unauthorized" });
  }
}
