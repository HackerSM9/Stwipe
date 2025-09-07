import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

/**
 * Downloads audio from a YouTube video URL and saves it as an MP3.
 * @param videoUrl YouTube video URL
 * @param outputDir Directory to save the audio
 * @returns Full path of the downloaded audio file
 */
export async function downloadAudio(videoUrl: string, outputDir: string): Promise<string> {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const tempFile = path.join(outputDir, `${Date.now()}.mp3`);

  return new Promise((resolve, reject) => {
    const stream = ytdl(videoUrl, { filter: "audioonly" });
    ffmpeg(stream)
      .audioBitrate(128)
      .format("mp3")
      .save(tempFile)
      .on("end", () => resolve(tempFile))
      .on("error", (err) => reject(err));
  });
}

/**
 * Deletes a temporary file safely
 * @param filePath Path to the file to delete
 */
export function cleanupFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
