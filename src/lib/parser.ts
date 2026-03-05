const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface ParsedAction {
  actionType: "TASK" | "MEETING" | "EMAIL";
  extractedFields: Record<string, unknown>;
  missingFields: string[];
  inferredFields: Record<string, unknown>;
}

interface ParseResult {
  actions: ParsedAction[];
}

const SYSTEM_PROMPT = `You are an intent parser for a personal assistant app. Given raw text from a user, extract one or more action items.

For each action item, determine:
1. actionType: "TASK", "MEETING", or "EMAIL"
2. extractedFields: fields explicitly stated by the user
3. missingFields: required fields NOT provided (list field names)
4. inferredFields: fields you can reasonably infer (with your reasoning)

Required fields by type:
- TASK: summary, assignee (who should do it), deadline
- MEETING: summary, invitees (email or name), date, time, duration_minutes, agenda
- EMAIL: to (recipient), subject, body

Respond with ONLY valid JSON matching this schema:
{
  "actions": [
    {
      "actionType": "MEETING",
      "extractedFields": { "invitees": ["John"], "date": "2026-03-10", "time": "14:00", "agenda": "Q2 pipeline review" },
      "missingFields": ["duration_minutes"],
      "inferredFields": { "summary": "Q2 pipeline review with John", "duration_minutes": 30 }
    }
  ]
}

Be smart about inference — if someone says "quick sync" infer 15 min, "meeting" infer 30 min, etc.
If the input contains multiple requests, return multiple actions.
Always return the JSON object, nothing else.`;

export async function parseIntake(rawText: string): Promise<ParseResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: rawText }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("Empty response from Claude");
  }

  // Parse JSON from response (handle potential markdown code blocks)
  const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const parsed: ParseResult = JSON.parse(jsonStr);

  return parsed;
}
