const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function transcribeAudio(
  audioBuffer: Buffer,
  ext: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const formData = new FormData();
  const uint8 = new Uint8Array(audioBuffer);
  const blob = new Blob([uint8], {
    type: ext === "webm" ? "audio/webm" : "audio/mp4",
  });
  formData.append("file", blob, `recording.${ext}`);
  formData.append("model", "whisper-1");

  const res = await fetch(WHISPER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whisper API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.text;
}
