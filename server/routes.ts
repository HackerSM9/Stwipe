import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPlaylistSchema } from "@shared/schema";
import { processPlaylist } from "./services/youtube";
import { authenticateUser, type AuthenticatedRequest } from "./middleware/auth";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User sync endpoint
  app.post("/api/users/sync", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userData = insertUserSchema.parse({
        firebaseUid: req.user!.uid,
        email: req.user!.email,
        name: req.user!.name,
      });
      
      let user = await storage.getUserByFirebaseUid(userData.firebaseUid);
      
      if (!user) {
        user = await storage.createUser(userData);
      } else {
        user = await storage.updateUser(user.id, userData);
      }
      
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get user stats
  app.get("/api/users/stats", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.user!.uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stats = await storage.getUserStats(user.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user playlists
  app.get("/api/playlists", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.user!.uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const playlists = await storage.getPlaylistsByUserId(user.id);
      res.json(playlists);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get specific playlist
  app.get("/api/playlists/:id", async (req, res) => {
    try {
      const playlist = await storage.getPlaylist(req.params.id);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Process playlist
  app.post("/api/playlists/process", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.user!.uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const processData = z.object({
        youtubeUrl: z.string().url(),
        language: z.string().default("hinglish"),
        subject: z.string().optional(),
      }).parse(req.body);

      // Extract playlist ID from URL
      const playlistIdMatch = processData.youtubeUrl.match(/[?&]list=([^&]+)/);
      if (!playlistIdMatch) {
        return res.status(400).json({ message: "Invalid YouTube playlist URL" });
      }

      const youtubePlaylistId = playlistIdMatch[1];

      // Create playlist record
      const playlistData = insertPlaylistSchema.parse({
        userId: user.id,
        title: `Playlist ${Date.now()}`, // Will be updated after fetching
        youtubeUrl: processData.youtubeUrl,
        youtubePlaylistId,
        subject: processData.subject,
        language: processData.language,
      });

      const playlist = await storage.createPlaylist(playlistData);

      // Start processing in background
      processPlaylist(playlist.id).catch(console.error);

      res.json(playlist);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get study shorts for playlist
  app.get("/api/playlists/:id/shorts", async (req, res) => {
    try {
      const shorts = await storage.getStudyShortsByPlaylistId(req.params.id);
      
      // Shuffle the shorts for random order
      const shuffledShorts = [...shorts].sort(() => Math.random() - 0.5);
      
      res.json(shuffledShorts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update user progress
  app.post("/api/progress/update", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.user!.uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { shortId, timeSpent } = z.object({
        shortId: z.string(),
        timeSpent: z.number(),
      }).parse(req.body);

      const studyShort = await storage.getStudyShort(shortId);
      if (!studyShort) {
        return res.status(404).json({ message: "Study short not found" });
      }

      let progress = await storage.getUserProgress(user.id, studyShort.playlistId);
      
      if (!progress) {
        progress = await storage.createUserProgress({
          userId: user.id,
          playlistId: studyShort.playlistId,
          currentShortId: shortId,
        });
      }

      const updatedProgress = await storage.updateUserProgress(user.id, studyShort.playlistId, {
        currentShortId: shortId,
        lastStudiedAt: new Date(),
        totalTimeSpent: (progress.totalTimeSpent || 0) + timeSpent,
      });

      res.json(updatedProgress);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Toggle bookmark
  app.post("/api/shorts/:id/bookmark", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.user!.uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const studyShort = await storage.getStudyShort(req.params.id);
      if (!studyShort) {
        return res.status(404).json({ message: "Study short not found" });
      }

      const progress = await storage.getUserProgress(user.id, studyShort.playlistId);
      if (!progress) {
        return res.status(404).json({ message: "Progress not found" });
      }

      const bookmarkedShorts = Array.isArray(progress.bookmarkedShorts) ? progress.bookmarkedShorts : [];
      const isBookmarked = bookmarkedShorts.includes(req.params.id);

      const updatedBookmarks = isBookmarked
        ? bookmarkedShorts.filter(id => id !== req.params.id)
        : [...bookmarkedShorts, req.params.id];

      await storage.updateUserProgress(user.id, studyShort.playlistId, {
        bookmarkedShorts: updatedBookmarks,
      });

      res.json({ bookmarked: !isBookmarked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Serve video files (placeholder endpoint)
  app.get("/api/shorts/:id/video", async (req, res) => {
    try {
      const studyShort = await storage.getStudyShort(req.params.id);
      if (!studyShort) {
        return res.status(404).json({ message: "Study short not found" });
      }

      // In a real implementation, this would serve the actual video file
      // For now, return a placeholder response
      res.status(200).json({ 
        message: "Video endpoint - would serve actual video file",
        short: studyShort 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
