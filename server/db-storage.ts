import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import { users, playlists, videos, studyShorts, userProgress } from "@shared/schema";
import type { User, InsertUser, Playlist, InsertPlaylist, Video, InsertVideo, StudyShort, InsertStudyShort, UserProgress, InsertUserProgress } from "@shared/schema";
import type { IStorage } from "./storage";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  // Playlist operations
  async getPlaylist(id: string): Promise<Playlist | undefined> {
    const result = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
    return result[0];
  }

  async getPlaylistsByUserId(userId: string): Promise<Playlist[]> {
    const result = await db.select().from(playlists)
      .where(eq(playlists.userId, userId))
      .orderBy(playlists.createdAt);
    return result;
  }

  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const result = await db.insert(playlists).values({
      ...insertPlaylist,
      status: "pending",
      totalVideos: 0,
      processedVideos: 0,
    }).returning();
    return result[0];
  }

  async updatePlaylist(id: string, updates: Partial<Playlist>): Promise<Playlist | undefined> {
    const result = await db.update(playlists).set(updates).where(eq(playlists.id, id)).returning();
    return result[0];
  }

  // Video operations
  async getVideo(id: string): Promise<Video | undefined> {
    const result = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return result[0];
  }

  async getVideosByPlaylistId(playlistId: string): Promise<Video[]> {
    const result = await db.select().from(videos)
      .where(eq(videos.playlistId, playlistId))
      .orderBy(videos.orderIndex);
    return result;
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const result = await db.insert(videos).values({
      ...insertVideo,
      status: "pending",
      processedShorts: 0,
      totalShorts: 0,
    }).returning();
    return result[0];
  }

  async createVideos(insertVideos: InsertVideo[]): Promise<Video[]> {
    const videosWithDefaults = insertVideos.map(video => ({
      ...video,
      status: "pending" as const,
      processedShorts: 0,
      totalShorts: 0,
    }));
    const result = await db.insert(videos).values(videosWithDefaults).returning();
    return result;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const result = await db.update(videos).set(updates).where(eq(videos.id, id)).returning();
    return result[0];
  }

  // Study shorts operations
  async getStudyShort(id: string): Promise<StudyShort | undefined> {
    const result = await db.select().from(studyShorts).where(eq(studyShorts.id, id)).limit(1);
    return result[0];
  }

  async getStudyShortsByPlaylistId(playlistId: string): Promise<StudyShort[]> {
    const result = await db.select().from(studyShorts)
      .where(eq(studyShorts.playlistId, playlistId))
      .orderBy(studyShorts.orderIndex);
    return result;
  }

  async getStudyShortsByVideoId(videoId: string): Promise<StudyShort[]> {
    const result = await db.select().from(studyShorts)
      .where(eq(studyShorts.videoId, videoId))
      .orderBy(studyShorts.orderIndex);
    return result;
  }

  async createStudyShort(insertStudyShort: InsertStudyShort): Promise<StudyShort> {
    const result = await db.insert(studyShorts).values(insertStudyShort).returning();
    return result[0];
  }

  async createStudyShorts(insertStudyShorts: InsertStudyShort[]): Promise<StudyShort[]> {
    if (insertStudyShorts.length === 0) return [];
    const result = await db.insert(studyShorts).values(insertStudyShorts).returning();
    return result;
  }

  // User progress operations
  async getUserProgress(userId: string, playlistId: string): Promise<UserProgress | undefined> {
    const result = await db.select().from(userProgress)
      .where(and(
        eq(userProgress.userId, userId),
        eq(userProgress.playlistId, playlistId)
      ))
      .limit(1);
    return result[0];
  }

  async createUserProgress(insertUserProgress: InsertUserProgress): Promise<UserProgress> {
    const result = await db.insert(userProgress).values({
      ...insertUserProgress,
      completedShorts: [],
      bookmarkedShorts: [],
      totalTimeSpent: 0,
    }).returning();
    return result[0];
  }

  async updateUserProgress(userId: string, playlistId: string, updates: Partial<UserProgress>): Promise<UserProgress | undefined> {
    const result = await db.update(userProgress)
      .set(updates)
      .where(and(
        eq(userProgress.userId, userId),
        eq(userProgress.playlistId, playlistId)
      ))
      .returning();
    return result[0];
  }

  async getUserStats(userId: string): Promise<{ totalShorts: number; hoursStudied: number; streak: number }> {
    const progressRecords = await db.select().from(userProgress)
      .where(eq(userProgress.userId, userId));
    
    const totalShorts = progressRecords.reduce((sum, progress) => {
      const completed = Array.isArray(progress.completedShorts) ? progress.completedShorts.length : 0;
      return sum + completed;
    }, 0);
    
    const totalTimeSpent = progressRecords.reduce((sum, progress) => {
      return sum + (progress.totalTimeSpent || 0);
    }, 0);
    
    const hoursStudied = Math.round((totalTimeSpent / 3600) * 10) / 10;
    
    // Simple streak calculation based on unique study dates
    const studyDates = progressRecords
      .filter(progress => progress.lastStudiedAt)
      .map(progress => new Date(progress.lastStudiedAt!).toDateString())
      .filter((date, index, array) => array.indexOf(date) === index);
    
    const streak = studyDates.length;
    
    return { totalShorts, hoursStudied, streak };
  }
}
