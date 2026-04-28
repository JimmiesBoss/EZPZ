import { getCategory } from "@/lib/categories";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

export interface ParsedSpecs {
  brand?: string;
  model?: string;
  partNumber?: string;
  year?: string;
  condition?: string;
  dimensions?: string;
  identifyingMarks?: string[];
  colors?: string[];
  searchKeywords?: string[];
  notes?: string;
}

export interface FlowAResult {
  specs: ParsedSpecs;
  missingFields: string[];
  rejectionReasons: string[];
  confidence: number;
}

export interface FlowAInput {
  primaryCategory: string;
  subCategory?: string;
  text: string;
  imageBase64?: { mediaType: string; data: string }[];
}

function systemPromptFor(primaryId: string, subId?: string): string {
  const cat = getCategory(primaryId);
  const sub = cat?.subcategories.find((s) => s.id === subId);
  const subLine = sub
    ? `Subcategory: ${sub.label}. Examples of relevant components: ${sub.examples.join(", ")}.`
    : `(No subcategory provided.)`;

  return `You are an intake parser for Widgeter, a parts-finder platform.
The buyer is searching within: ${cat?.label ?? primaryId}.
${subLine}

Extract a structured spec from the buyer's description (and optional images). Be concrete; never invent values.

Return ONLY valid JSON of this shape, with no prose:
{
  "specs": {
    "brand": string?,
    "model": string?,
    "partNumber": string?,
    "year": string?,
    "condition": string?,
    "dimensions": string?,
    "identifyingMarks": string[],
    "colors": string[],
    "searchKeywords": string[],
    "notes": string?
  },
  "missingFields": string[],
  "rejectionReasons": string[],
  "confidence": number
}

Rules:
- "missingFields" lists field names that a sourcing agent would still need to find this part (e.g. ["partNumber","year"]). Keep it short — only the truly necessary ones.
- "rejectionReasons" lists reasons this request is OUT OF SCOPE (e.g. "complete working unit", "collectible", "decorative item"). Empty array if it is in scope.
- "confidence" is 0-1: how confident are you in the extracted specs given the input.
- Always return the JSON object only.`;
}

export async function parsePartsRequest(input: FlowAInput): Promise<FlowAResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const userContent: unknown[] = [];
  if (input.imageBase64?.length) {
    for (const img of input.imageBase64.slice(0, 5)) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      });
    }
  }
  userContent.push({ type: "text", text: input.text });

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPromptFor(input.primaryCategory, input.subCategory),
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "";
  const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(jsonStr) as Partial<FlowAResult>;
    return {
      specs: parsed.specs ?? {},
      missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
      rejectionReasons: Array.isArray(parsed.rejectionReasons) ? parsed.rejectionReasons : [],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch {
    return {
      specs: { notes: input.text.slice(0, 500) },
      missingFields: ["details"],
      rejectionReasons: [],
      confidence: 0.2,
    };
  }
}

export interface FlowBInput {
  currentSpecs: ParsedSpecs;
  question: string;
  answer: string;
  primaryCategory: string;
  subCategory?: string;
}

export interface FlowBResult {
  updatedSpecs: ParsedSpecs;
  stillMissing: string[];
}

export async function mergeClarification(input: FlowBInput): Promise<FlowBResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const cat = getCategory(input.primaryCategory);
  const system = `You are merging a buyer's clarification answer into an existing parts-finder spec.
Category: ${cat?.label ?? input.primaryCategory}. Return ONLY JSON:
{ "updatedSpecs": {...same shape as input...}, "stillMissing": string[] }
Only modify fields the answer addresses. Do not invent.`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            currentSpecs: input.currentSpecs,
            question: input.question,
            answer: input.answer,
          }),
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error ${res.status}`);
  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "";
  const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(jsonStr) as Partial<FlowBResult>;
    return {
      updatedSpecs: parsed.updatedSpecs ?? input.currentSpecs,
      stillMissing: Array.isArray(parsed.stillMissing) ? parsed.stillMissing : [],
    };
  } catch {
    return { updatedSpecs: input.currentSpecs, stillMissing: [] };
  }
}
