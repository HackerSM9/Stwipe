import { storage } from "../storage";
import { transcribeAudio } from "./whisper";
import { filterContent } from "./contentFilter";
import { insertStudyShortSchema, insertVideoSchema } from "@shared/schema";

interface YouTubeVideo {
  id: string;
  title: string;
  duration: number;
  url: string;
}

// Mock YouTube API integration - simulating a 14-video playlist
async function fetchPlaylistInfo(playlistId: string): Promise<{ title: string; videos: YouTubeVideo[] }> {
  // In a real implementation, this would use the YouTube Data API v3
  // For now, return mock data that simulates the user's 14-video playlist
  
  const mockVideos: YouTubeVideo[] = [
    { id: "v1", title: "Introduction to Physics - Newton's Laws", duration: 900, url: "https://www.youtube.com/watch?v=v1" },
    { id: "v2", title: "Motion and Forces Explained", duration: 720, url: "https://www.youtube.com/watch?v=v2" },
    { id: "v3", title: "Energy and Work Principles", duration: 840, url: "https://www.youtube.com/watch?v=v3" },
    { id: "v4", title: "Momentum and Collisions", duration: 780, url: "https://www.youtube.com/watch?v=v4" },
    { id: "v5", title: "Circular Motion and Gravity", duration: 960, url: "https://www.youtube.com/watch?v=v5" },
    { id: "v6", title: "Oscillations and Waves", duration: 1020, url: "https://www.youtube.com/watch?v=v6" },
    { id: "v7", title: "Thermodynamics Basics", duration: 1140, url: "https://www.youtube.com/watch?v=v7" },
    { id: "v8", title: "Electric Fields and Forces", duration: 900, url: "https://www.youtube.com/watch?v=v8" },
    { id: "v9", title: "Magnetic Fields and Induction", duration: 1080, url: "https://www.youtube.com/watch?v=v9" },
    { id: "v10", title: "AC and DC Circuits", duration: 990, url: "https://www.youtube.com/watch?v=v10" },
    { id: "v11", title: "Optics and Light", duration: 870, url: "https://www.youtube.com/watch?v=v11" },
    { id: "v12", title: "Modern Physics Introduction", duration: 1200, url: "https://www.youtube.com/watch?v=v12" },
    { id: "v13", title: "Quantum Mechanics Basics", duration: 1350, url: "https://www.youtube.com/watch?v=v13" },
    { id: "v14", title: "Nuclear Physics and Radioactivity", duration: 1020, url: "https://www.youtube.com/watch?v=v14" }
  ];

  return {
    title: "Complete Physics Course - 14 Video Series",
    videos: mockVideos,
  };
}

async function downloadAudio(videoUrl: string): Promise<Buffer> {
  // In a real implementation, this would download the audio from YouTube
  // using a library like youtube-dl or similar
  console.log(`Downloading audio from: ${videoUrl}`);
  
  // Return mock audio buffer
  return Buffer.from("mock-audio-data");
}

export async function processPlaylist(playlistId: string): Promise<void> {
  try {
    const playlist = await storage.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }

    // Update status to processing
    await storage.updatePlaylist(playlistId, { status: "processing" });

    // Fetch playlist information
    const playlistInfo = await fetchPlaylistInfo(playlist.youtubePlaylistId);
    
    // Update playlist with video count and title
    await storage.updatePlaylist(playlistId, {
      title: playlistInfo.title,
      totalVideos: playlistInfo.videos.length,
    });

    // Create video records in database
    const videoData = playlistInfo.videos.map((video, index) => 
      insertVideoSchema.parse({
        playlistId: playlist.id,
        title: video.title,
        youtubeVideoId: video.id,
        youtubeUrl: video.url,
        duration: video.duration,
        orderIndex: index,
      })
    );
    
    const createdVideos = await storage.createVideos(videoData);
    const allStudyShorts = [];

    // Process each video
    for (let i = 0; i < createdVideos.length; i++) {
      const dbVideo = createdVideos[i];
      const youtubeVideo = playlistInfo.videos[i];
      
      try {
        console.log(`Processing video ${i + 1}/${createdVideos.length}: ${dbVideo.title}`);

        // Update video status to processing
        await storage.updateVideo(dbVideo.id, { status: "processing" });

        // Download audio
        const audioBuffer = await downloadAudio(youtubeVideo.url);

        // Transcribe audio using Whisper
        const transcription = await transcribeAudio(audioBuffer, playlist.language);

        // Filter content to remove filler words and irrelevant content
        const filteredContent = await filterContent(transcription.text, playlist.language);

        // Segment content into study shorts
        const segments = await segmentContent(filteredContent, dbVideo.title);

        // Create study shorts for this video
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
            orderIndex: j, // Order within this video
          });

          const studyShort = await storage.createStudyShort(studyShortData);
          videoShorts.push(studyShort);
          allStudyShorts.push(studyShort);
        }

        // Update video with shorts count and mark as completed
        await storage.updateVideo(dbVideo.id, { 
          status: "completed",
          totalShorts: videoShorts.length,
          processedShorts: videoShorts.length
        });

        // Update playlist progress
        await storage.updatePlaylist(playlistId, {
          processedVideos: i + 1,
        });

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing video ${dbVideo.title}:`, error);
        // Mark video as failed and continue
        await storage.updateVideo(dbVideo.id, { status: "failed" });
      }
    }

    // Mark as completed
    await storage.updatePlaylist(playlistId, {
      status: "completed",
      completedAt: new Date(),
    });

    console.log(`Playlist processing completed: ${allStudyShorts.length} study shorts created`);

  } catch (error) {
    console.error("Error processing playlist:", error);
    await storage.updatePlaylist(playlistId, { status: "failed" });
    throw error;
  }
}

interface ContentSegment {
  topic: string;
  content: string;
  startTime: number;
  endTime: number;
}

async function segmentContent(content: string, videoTitle: string): Promise<ContentSegment[]> {
  // In a real implementation, this would use AI to intelligently segment content
  // For now, create simple segments
  
  const words = content.split(' ');
  const segmentSize = Math.ceil(words.length / 3); // Create 3 segments per video
  const segments: ContentSegment[] = [];

  for (let i = 0; i < 3; i++) {
    const startIndex = i * segmentSize;
    const endIndex = Math.min((i + 1) * segmentSize, words.length);
    const segmentWords = words.slice(startIndex, endIndex);
    
    if (segmentWords.length > 0) {
      segments.push({
        topic: `${videoTitle} - Concept ${i + 1}`,
        content: segmentWords.join(' '),
        startTime: i * 180, // 3 minutes per segment
        endTime: (i + 1) * 180,
      });
    }
  }

  return segments;
}
