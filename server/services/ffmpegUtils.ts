import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

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

export function cleanupFile(filePath: string) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
