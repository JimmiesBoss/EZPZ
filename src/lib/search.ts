import { prisma } from "@/lib/prisma";
import { fixturesFor } from "@/lib/search.fixtures";
import { labelFor } from "@/lib/sanitize";
import { audit } from "@/lib/audit";
import { canTransitionRequest, type RequestStatus } from "@/lib/stateMachine";

export async function dispatchSearch(requestId: string) {
  const request = await prisma.partsRequest.findUnique({ where: { id: requestId } });
  if (!request) return;

  const fixtures = fixturesFor(request.primaryCategory, request.subCategory || undefined);
  const picks = fixtures.slice(0, 3 + (Math.floor(Math.random() * 3))); // 3-5
  const delay = 1500 + Math.random() * 2500;

  setTimeout(async () => {
    try {
      await ingestMatches(requestId, picks);
    } catch (err) {
      console.error("Mock search ingest failed:", err);
    }
  }, delay);
}

export async function ingestMatches(
  requestId: string,
  picks: ReturnType<typeof fixturesFor>
) {
  const request = await prisma.partsRequest.findUnique({ where: { id: requestId } });
  if (!request) return;

  for (const pick of picks) {
    await prisma.match.create({
      data: {
        requestId,
        sourceMarketplace: pick.sourceMarketplace,
        listingUrl: pick.listingUrl,
        sellerHandle: pick.sellerHandle,
        sellerLocation: pick.sellerLocation,
        displayLabel: labelFor(requestId, pick.sourceMarketplace),
        title: pick.title,
        priceCents: pick.priceCents,
        shippingCents: pick.shippingCents,
        condition: pick.condition,
        thumbnailUrl: pick.thumbnailUrl,
        specHighlights: JSON.stringify(pick.specHighlights ?? {}),
        confidence: pick.confidence,
        status: "PRESENTED",
      },
    });
  }

  const from = request.status as RequestStatus;
  const to: RequestStatus = canTransitionRequest(from, "CURATED")
    ? "CURATED"
    : canTransitionRequest(from, "AWAITING_REVIEW")
      ? "AWAITING_REVIEW"
      : from;

  // Auto-publish from CURATED → AWAITING_REVIEW for the prototype (operator
  // can still re-trigger). Use a single transition for simplicity.
  const finalStatus: RequestStatus =
    to === "CURATED" && canTransitionRequest("CURATED", "AWAITING_REVIEW")
      ? "AWAITING_REVIEW"
      : to;

  await prisma.partsRequest.update({
    where: { id: requestId },
    data: { status: finalStatus },
  });

  await audit({
    event: "SEARCH_RESULTS_INGESTED",
    requestId,
    metadata: { count: picks.length, status: finalStatus },
  });
}
