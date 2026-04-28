import { createHash } from "crypto";
import type { Match } from "@prisma/client";

const LABELS = ["A", "B", "C", "D", "E", "F"];

export function labelFor(requestId: string, sourceMarketplace: string): string {
  const hash = createHash("sha1").update(`${requestId}:${sourceMarketplace}`).digest();
  return `Marketplace ${LABELS[hash[0] % LABELS.length]}`;
}

export interface SanitizedMatch {
  id: string;
  requestId: string;
  displayLabel: string;
  title: string;
  priceCents: number;
  shippingCents: number;
  condition: string;
  thumbnailUrl: string | null;
  specHighlights: Record<string, unknown>;
  confidence: number;
  status: string;
  hiddenFromBuyer: boolean;
  proofVideoUrl: string | null;
  source?: {
    marketplace: string;
    listingUrl: string;
    sellerHandle: string;
    sellerLocation: string;
  };
}

export function sanitizeMatch(
  match: Match,
  viewerRole: "BUYER" | "OPERATOR"
): SanitizedMatch {
  const base: SanitizedMatch = {
    id: match.id,
    requestId: match.requestId,
    displayLabel: match.displayLabel,
    title: match.title,
    priceCents: match.priceCents,
    shippingCents: match.shippingCents,
    condition: match.condition,
    thumbnailUrl: match.thumbnailUrl,
    specHighlights: safeJSON(match.specHighlights),
    confidence: match.confidence,
    status: match.status,
    hiddenFromBuyer: match.hiddenFromBuyer,
    proofVideoUrl: match.proofVideoUrl,
  };

  const reveal =
    viewerRole === "OPERATOR" || match.status === "BUYER_APPROVED";
  if (reveal) {
    base.source = {
      marketplace: match.sourceMarketplace,
      listingUrl: match.listingUrl,
      sellerHandle: match.sellerHandle,
      sellerLocation: match.sellerLocation,
    };
  }
  return base;
}

function safeJSON(s: string): Record<string, unknown> {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
