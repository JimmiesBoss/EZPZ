import {
  CATEGORIES,
  GLOBAL_REJECTION_PATTERNS,
  STANDARD_REJECTION_COPY,
  type Category,
  type Subcategory,
} from "@/lib/categories";

export type RoutingDecision =
  | { mode: "exact"; primary: string; sub?: string; confidence: number }
  | { mode: "partial"; candidates: { primary: string; sub?: string; score: number }[] }
  | { mode: "unclear" }
  | { mode: "reject"; message: string; reason: string };

const STOPWORDS = new Set([
  "the", "a", "an", "for", "of", "and", "or", "to", "with", "in", "on",
  "my", "i", "need", "looking", "find", "want", "buy", "have", "is", "are",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function scoreCategory(tokens: string[], cat: Category): { score: number; sub?: Subcategory } {
  const text = tokens.join(" ");
  let score = 0;

  for (const kw of cat.keywords) {
    if (text.includes(kw.toLowerCase())) score += kw.includes(" ") ? 2 : 1;
  }

  let bestSub: Subcategory | undefined;
  let bestSubScore = 0;
  for (const sub of cat.subcategories) {
    let sScore = 0;
    for (const ex of sub.examples) {
      if (text.includes(ex.toLowerCase())) sScore += ex.includes(" ") ? 2 : 1;
    }
    if (sScore > bestSubScore) {
      bestSubScore = sScore;
      bestSub = sub;
    }
  }

  return { score: score + bestSubScore, sub: bestSub };
}

export function routeSearch(rawText: string, supportEmail: string): RoutingDecision {
  const text = rawText.trim();
  if (!text) return { mode: "unclear" };

  for (const { pattern, reason } of GLOBAL_REJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { mode: "reject", reason, message: STANDARD_REJECTION_COPY(supportEmail) };
    }
  }

  const tokens = tokenize(text);
  if (tokens.length === 0) return { mode: "unclear" };

  const scored = CATEGORIES.map((cat) => {
    const { score, sub } = scoreCategory(tokens, cat);
    return { primary: cat.id, sub: sub?.id, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { mode: "unclear" };

  const top = scored[0];
  const second = scored[1]?.score ?? 0;

  if (top.score >= 3 && top.score >= second * 1.5) {
    return {
      mode: "exact",
      primary: top.primary,
      sub: top.sub,
      confidence: Math.min(1, top.score / 6),
    };
  }

  return {
    mode: "partial",
    candidates: scored.slice(0, 3),
  };
}
