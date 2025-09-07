import { type User, type InsertUser, type Playlist, type InsertPlaylist, type Video, type InsertVideo, type StudyShort, type InsertStudyShort, type UserProgress, type InsertUserProgress } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;

  // Playlist operations
  getPlaylist(id: string): Promise<Playlist | undefined>;
  getPlaylistsByUserId(userId: string): Promise<Playlist[]>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  updatePlaylist(id: string, playlist: Partial<Playlist>): Promise<Playlist | undefined>;

  // Video operations
  getVideo(id: string): Promise<Video | undefined>;
  getVideosByPlaylistId(playlistId: string): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  createVideos(videos: InsertVideo[]): Promise<Video[]>;
  updateVideo(id: string, video: Partial<Video>): Promise<Video | undefined>;

  // Study shorts operations
  getStudyShort(id: string): Promise<StudyShort | undefined>;
  getStudyShortsByPlaylistId(playlistId: string): Promise<StudyShort[]>;
  getStudyShortsByVideoId(videoId: string): Promise<StudyShort[]>;
  createStudyShort(studyShort: InsertStudyShort): Promise<StudyShort>;
  createStudyShorts(studyShorts: InsertStudyShort[]): Promise<StudyShort[]>;

  // User progress operations
  getUserProgress(userId: string, playlistId: string): Promise<UserProgress | undefined>;
  createUserProgress(userProgress: InsertUserProgress): Promise<UserProgress>;
  updateUserProgress(userId: string, playlistId: string, progress: Partial<UserProgress>): Promise<UserProgress | undefined>;
  getUserStats(userId: string): Promise<{ totalShorts: number; hoursStudied: number; streak: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private playlists: Map<string, Playlist>;
  private studyShorts: Map<string, StudyShort>;
  private userProgress: Map<string, UserProgress>;

  constructor() {
    this.users = new Map();
    this.playlists = new Map();
    this.studyShorts = new Map();
    this.userProgress = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.firebaseUid === firebaseUid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Playlist operations
  async getPlaylist(id: string): Promise<Playlist | undefined> {
    return this.playlists.get(id);
  }

  async getPlaylistsByUserId(userId: string): Promise<Playlist[]> {
    return Array.from(this.playlists.values())
      .filter(playlist => playlist.userId === userId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const id = randomUUID();
    const playlist: Playlist = {
      ...insertPlaylist,
      id,
      status: "pending",
      totalVideos: 0,
      processedVideos: 0,
      createdAt: new Date(),
      completedAt: null,
      subject: insertPlaylist.subject || null,
      language: insertPlaylist.language || "hinglish",
    };
    this.playlists.set(id, playlist);
    return playlist;
  }

  async updatePlaylist(id: string, updates: Partial<Playlist>): Promise<Playlist | undefined> {
    const playlist = this.playlists.get(id);
    if (!playlist) return undefined;
    
    const updatedPlaylist = { ...playlist, ...updates };
    this.playlists.set(id, updatedPlaylist);
    return updatedPlaylist;
  }

  // Video operations
  async getVideo(id: string): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async getVideosByPlaylistId(playlistId: string): Promise<Video[]> {
    return Array.from(this.videos.values())
      .filter(video => video.playlistId === playlistId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = randomUUID();
    const video: Video = {
      ...insertVideo,
      id,
      status: "pending",
      processedShorts: 0,
      totalShorts: 0,
      createdAt: new Date(),
    };
    this.videos.set(id, video);
    return video;
  }

  async createVideos(insertVideos: InsertVideo[]): Promise<Video[]> {
    const videos: Video[] = [];
    for (const insertVideo of insertVideos) {
      const video = await this.createVideo(insertVideo);
      videos.push(video);
    }
    return videos;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const video = this.videos.get(id);
    if (!video) return undefined;
    
    const updatedVideo = { ...video, ...updates };
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }

  // Study shorts operations
  async getStudyShort(id: string): Promise<StudyShort | undefined> {
    return this.studyShorts.get(id);
  }

  async getStudyShortsByPlaylistId(playlistId: string): Promise<StudyShort[]> {
    return Array.from(this.studyShorts.values())
      .filter(short => short.playlistId === playlistId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async createStudyShort(insertStudyShort: InsertStudyShort): Promise<StudyShort> {
    const id = randomUUID();
    const studyShort: StudyShort = {
      ...insertStudyShort,
      id,
      createdAt: new Date(),
    };
    this.studyShorts.set(id, studyShort);
    return studyShort;
  }

  async createStudyShorts(insertStudyShorts: InsertStudyShort[]): Promise<StudyShort[]> {
    const studyShorts: StudyShort[] = [];
    for (const insertStudyShort of insertStudyShorts) {
      const studyShort = await this.createStudyShort(insertStudyShort);
      studyShorts.push(studyShort);
    }
    return studyShorts;
  }

  // User progress operations
  async getUserProgress(userId: string, playlistId: string): Promise<UserProgress | undefined> {
    return Array.from(this.userProgress.values())
      .find(progress => progress.userId === userId && progress.playlistId === playlistId);
  }

  async createUserProgress(insertUserProgress: InsertUserProgress): Promise<UserProgress> {
    const id = randomUUID();
    const userProgress: UserProgress = {
      ...insertUserProgress,
      id,
      currentShortId: insertUserProgress.currentShortId || null,
      completedShorts: [],
      bookmarkedShorts: [],
      lastStudiedAt: null,
      totalTimeSpent: 0,
    };
    this.userProgress.set(id, userProgress);
    return userProgress;
  }

  async updateUserProgress(userId: string, playlistId: string, updates: Partial<UserProgress>): Promise<UserProgress | undefined> {
    const progress = await this.getUserProgress(userId, playlistId);
    if (!progress) return undefined;
    
    const updatedProgress = { ...progress, ...updates };
    this.userProgress.set(progress.id, updatedProgress);
    return updatedProgress;
  }

  async getUserStats(userId: string): Promise<{ totalShorts: number; hoursStudied: number; streak: number }> {
    const userProgressList = Array.from(this.userProgress.values())
      .filter(progress => progress.userId === userId);
    
    const totalShorts = userProgressList.reduce((sum, progress) => {
      return sum + (Array.isArray(progress.completedShorts) ? progress.completedShorts.length : 0);
    }, 0);
    
    const totalTimeSpent = userProgressList.reduce((sum, progress) => {
      return sum + (progress.totalTimeSpent || 0);
    }, 0);
    
    const hoursStudied = Math.round((totalTimeSpent / 3600) * 10) / 10;
    
    // Simple streak calculation - days with study activity
    const recentStudyDates = userProgressList
      .filter(progress => progress.lastStudiedAt)
      .map(progress => new Date(progress.lastStudiedAt!).toDateString())
      .filter((date, index, array) => array.indexOf(date) === index);
    
    const streak = recentStudyDates.length;
    
    return { totalShorts, hoursStudied, streak };
  }
}

import { DatabaseStorage } from "./db-storage";

// Use database storage for persistence
export const storage = new MemStorage();
