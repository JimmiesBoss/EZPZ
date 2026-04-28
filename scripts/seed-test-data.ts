import { PrismaClient } from "@prisma/client";
import { labelFor } from "../src/lib/sanitize";

const prisma = new PrismaClient();

async function main() {
  const buyer = await prisma.user.findUnique({ where: { email: "buyer@widgeter.test" } });
  if (!buyer) throw new Error("seed-test-session must run first");

  // Clean any prior test request from this buyer.
  await prisma.partsRequest.deleteMany({ where: { buyerId: buyer.id } });

  const req = await prisma.partsRequest.create({
    data: {
      buyerId: buyer.id,
      primaryCategory: "audio",
      subCategory: "amp",
      title: "1974 Fender Champ output transformer",
      rawDescription: "5F1 circuit, primary 5K secondary 4/8/16Ω, prefer NOS Hammond.",
      specs: JSON.stringify({ brand: "Fender", model: "Champ 5F1", year: "1974", condition: "working pull or NOS" }),
      missingFields: JSON.stringify([]),
      rejectionReasons: JSON.stringify([]),
      budgetCents: 25000,
      waiverVersion: "audio-v1@1.0",
      waiverAcceptedAt: new Date(),
      status: "AWAITING_REVIEW",
    },
  });

  const matches = [
    { title: "Hammond 1750J output transformer (NOS)", priceCents: 13800, shippingCents: 2000, condition: "New old stock", sourceMarketplace: "reverb", listingUrl: "https://reverb.com/example", sellerHandle: "tube_amp_parts", sellerLocation: "Nashville, TN", confidence: 0.91 },
    { title: "Mercury Magnetics replacement OT", priceCents: 18900, shippingCents: 0, condition: "New", sourceMarketplace: "specialty", listingUrl: "https://mercurymagnetics.example.com/1", sellerHandle: "MercuryDirect", sellerLocation: "Chatsworth, CA", confidence: 0.87 },
    { title: "Used Champ output transformer (tested)", priceCents: 6500, shippingCents: 1500, condition: "Used", sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "vintage_audio_seller", sellerLocation: "Memphis, TN", confidence: 0.72 },
  ];

  for (const m of matches) {
    await prisma.match.create({
      data: {
        requestId: req.id,
        ...m,
        displayLabel: labelFor(req.id, m.sourceMarketplace),
        specHighlights: JSON.stringify({}),
        status: "PRESENTED",
      },
    });
  }

  console.log(JSON.stringify({ requestId: req.id, matchTitles: matches.map((m) => m.title) }));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
