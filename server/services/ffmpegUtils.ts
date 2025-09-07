import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import ytdl from "ytdl-core";

export async function downloadAudio(videoUrl: string, outputDir: string): Promise<string> {
  const tempFile = path.join(outputDir, `${Date.now()}.mp3`);

  return new Promise((resolve, reject) => {
    const stream = ytdl(videoUrl, { filter: "audioonly" });
    ffmpeg(stream)
      .audioBitrate(128)
      .save(tempFile)
      .on("end", () => resolve(tempFile))
      .on("error", (err) => reject(err));
  });
}

export function cleanupFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
