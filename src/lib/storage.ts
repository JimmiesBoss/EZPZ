import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const AUDIO_DIR = process.env.AUDIO_STORAGE_PATH || "./data/audio";

export async function saveAudioFile(
  buffer: Buffer,
  ext: string
): Promise<string> {
  await fs.mkdir(AUDIO_DIR, { recursive: true });

  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const filePath = path.join(AUDIO_DIR, filename);

  await fs.writeFile(filePath, buffer);

  return `/audio/${filename}`;
}
