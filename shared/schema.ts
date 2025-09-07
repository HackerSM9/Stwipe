import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playlists = pgTable("playlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  youtubePlaylistId: text("youtube_playlist_id").notNull(),
  subject: text("subject"),
  language: text("language").notNull().default("hinglish"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  totalVideos: integer("total_videos").default(0),
  processedVideos: integer("processed_videos").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playlistId: varchar("playlist_id").notNull().references(() => playlists.id),
  title: text("title").notNull(),
  youtubeVideoId: text("youtube_video_id").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  duration: integer("duration").notNull(), // in seconds
  orderIndex: integer("order_index").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  processedShorts: integer("processed_shorts").default(0),
  totalShorts: integer("total_shorts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studyShorts = pgTable("study_shorts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playlistId: varchar("playlist_id").notNull().references(() => playlists.id),
  videoId: varchar("video_id").notNull().references(() => videos.id),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  content: text("content").notNull(),
  startTime: integer("start_time").notNull(), // in seconds
  endTime: integer("end_time").notNull(), // in seconds
  duration: integer("duration").notNull(), // in seconds
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  playlistId: varchar("playlist_id").notNull().references(() => playlists.id),
  currentShortId: varchar("current_short_id").references(() => studyShorts.id),
  completedShorts: jsonb("completed_shorts").default([]), // array of short IDs
  bookmarkedShorts: jsonb("bookmarked_shorts").default([]), // array of short IDs
  lastStudiedAt: timestamp("last_studied_at"),
  totalTimeSpent: integer("total_time_spent").default(0), // in seconds
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  firebaseUid: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).pick({
  userId: true,
  title: true,
  youtubeUrl: true,
  youtubePlaylistId: true,
  subject: true,
  language: true,
});

export const insertVideoSchema = createInsertSchema(videos).pick({
  playlistId: true,
  title: true,
  youtubeVideoId: true,
  youtubeUrl: true,
  duration: true,
  orderIndex: true,
});

export const insertStudyShortSchema = createInsertSchema(studyShorts).pick({
  playlistId: true,
  videoId: true,
  title: true,
  topic: true,
  content: true,
  startTime: true,
  endTime: true,
  duration: true,
  orderIndex: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).pick({
  userId: true,
  playlistId: true,
  currentShortId: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type StudyShort = typeof studyShorts.$inferSelect;
export type InsertStudyShort = z.infer<typeof insertStudyShortSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
