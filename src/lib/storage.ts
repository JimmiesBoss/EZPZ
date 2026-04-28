import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ROOT = process.env.MEDIA_STORAGE_PATH || "./data/widgeter";

export const IMAGE_DIR = path.join(ROOT, "images");
export const AUDIO_DIR = path.join(ROOT, "audio");

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveImage(buffer: Buffer, mediaType: string) {
  await ensureDir(IMAGE_DIR);
  const ext = mediaType.split("/")[1] || "bin";
  const id = randomUUID();
  const filename = `${id}.${ext}`;
  await fs.writeFile(path.join(IMAGE_DIR, filename), buffer);
  return { id, url: `/api/media/images/${filename}` };
}

export async function saveAudio(buffer: Buffer, mediaType: string) {
  await ensureDir(AUDIO_DIR);
  const ext = mediaType.split("/")[1]?.split(";")[0] || "webm";
  const id = randomUUID();
  const filename = `${id}.${ext}`;
  await fs.writeFile(path.join(AUDIO_DIR, filename), buffer);
  return { id, url: `/api/media/audio/${filename}`, path: path.join(AUDIO_DIR, filename) };
}

export async function readMedia(kind: "images" | "audio", filename: string) {
  const safe = path.basename(filename);
  const dir = kind === "images" ? IMAGE_DIR : AUDIO_DIR;
  const fullPath = path.join(dir, safe);
  const data = await fs.readFile(fullPath);
  return data;
}
