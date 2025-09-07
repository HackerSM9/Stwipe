import { storage } from "../storage";
import { transcribeAudio } from "./whisper";
import { filterContent } from "./contentFilter";
import { insertStudyShortSchema, insertVideoSchema } from "@shared/schema";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

interface YouTubeVideo {
  id: string;
  title: string;
  duration: number; // seconds
  url: string;
}

async function fetchPlaylistVideos(playlistId: string): Promise<YouTubeVideo[]> {
  // Replace this with real YouTube API logic if you want
  // For now, using ytdl-core to get info from video URLs
  throw new Error("Implement YouTube API fetch here or pass an array of video URLs");
}

async function downloadAudio(videoUrl: string, outputDir: string): Promise<string> {
  const tempFile = path.join(outputDir, `${Date.now()}.mp3`);
  
  return new Promise((resolve, reject) => {
    const stream = ytdl(videoUrl, { filter: 'audioonly' });
    ffmpeg(stream)
      .audioBitrate(128)
      .save(tempFile)
      .on("end", () => resolve(tempFile))
      .on("error", (err) => reject(err));
  });
}

interface ContentSegment {
  topic: string;
  content: string;
  startTime: number;
  endTime: number;
}

async function segmentContent(content: string, videoTitle: string): Promise<ContentSegment[]> {
  const words = content.split(" ");
  const segmentSize = Math.ceil(words.length / 3); // 3 segments per video
  const segments: ContentSegment[] = [];

  for (let i = 0; i < 3; i++) {
    const startIndex = i * segmentSize;
    const endIndex = Math.min((i + 1) * segmentSize, words.length);
    const segmentWords = words.slice(startIndex, endIndex);

    if (segmentWords.length > 0) {
      segments.push({
        topic: `${videoTitle} - Concept ${i + 1}`,
        content: segmentWords.join(" "),
        startTime: i * 180, // example 3 minutes
        endTime: (i + 1) * 180,
      });
    }
  }

  return segments;
}

export async function processPlaylist(playlistId: string, videoUrls: string[], language: string = "hinglish") {
  try {
    const playlist = await storage.getPlaylist(playlistId);
    if (!playlist) throw new Error("Playlist not found");

    await storage.updatePlaylist(playlistId, { status: "processing" });

    const createdVideos = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const url = videoUrls[i];
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title;
      const duration = parseInt(info.videoDetails.lengthSeconds, 10);

      const videoData = insertVideoSchema.parse({
        playlistId: playlist.id,
        title,
        youtubeVideoId: info.videoDetails.videoId,
        youtubeUrl: url,
        duration,
        orderIndex: i,
      });

      const dbVideo = await storage.createVideo(videoData);
      createdVideos.push(dbVideo);
    }

    for (let i = 0; i < createdVideos.length; i++) {
      const dbVideo = createdVideos[i];
      try {
        await storage.updateVideo(dbVideo.id, { status: "processing" });

        const audioFile = await downloadAudio(dbVideo.youtubeUrl, "./temp");

        const transcription = await transcribeAudio(fs.readFileSync(audioFile), language);
        const filteredContent = await filterContent(transcription.text, language);

        const segments = await segmentContent(filteredContent, dbVideo.title);
        const videoShorts = [];

        for (let j = 0; j < segments.length; j++) {
          const segment = segments[j];
          const studyShortData = insertStudyShortSchema.parse({
            playlistId: playlist.id,
            videoId: dbVideo.id,
            title: `${dbVideo.title} - Part ${j + 1}`,
            topic: segment.topic,
            content: segment.content,
            startTime: segment.startTime,
            endTime: segment.endTime,
            duration: segment.endTime - segment.startTime,
            orderIndex: j,
          });

          const studyShort = await storage.createStudyShort(studyShortData);
          videoShorts.push(studyShort);
        }

        await storage.updateVideo(dbVideo.id, {
          status: "completed",
          totalShorts: videoShorts.length,
          processedShorts: videoShorts.length,
        });

        await storage.updatePlaylist(playlistId, { processedVideos: i + 1 });
        fs.unlinkSync(audioFile); // cleanup
      } catch (err) {
        console.error(`Error processing video ${dbVideo.title}:`, err);
        await storage.updateVideo(dbVideo.id, { status: "failed" });
      }
    }

    await storage.updatePlaylist(playlistId, { status: "completed", completedAt: new Date() });
    console.log(`Playlist processed: ${createdVideos.length} videos`);
  } catch (err) {
    console.error("Error processing playlist:", err);
    await storage.updatePlaylist(playlistId, { status: "failed" });
    throw err;
  }
}
