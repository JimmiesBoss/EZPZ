const WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function transcribeAudio(buffer: Buffer, mediaType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const ext = mediaType.split("/")[1]?.split(";")[0] || "webm";
  const filename = `audio.${ext}`;

  const blob = new Blob([new Uint8Array(buffer)], { type: mediaType });
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", "whisper-1");
  form.append("response_format", "json");

  const res = await fetch(WHISPER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whisper API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return typeof data.text === "string" ? data.text : "";
}
