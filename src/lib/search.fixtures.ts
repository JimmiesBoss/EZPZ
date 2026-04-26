export interface MatchFixture {
  title: string;
  priceCents: number;
  shippingCents: number;
  condition: string;
  thumbnailUrl?: string;
  sourceMarketplace: string;
  listingUrl: string;
  sellerHandle: string;
  sellerLocation: string;
  specHighlights: Record<string, string>;
  confidence: number;
}

const PIC = (q: string) => `https://placehold.co/200x200/0a0a0a/fff?text=${encodeURIComponent(q)}`;

const FIXTURES: Record<string, MatchFixture[]> = {
  automotive: [
    { title: "Reman 100A alternator (GM 12V)", priceCents: 9900, shippingCents: 1500, condition: "Remanufactured", thumbnailUrl: PIC("Alt"), sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "autoparts_pro", sellerLocation: "Dallas, TX", specHighlights: { amperage: "100A", warranty: "1yr" }, confidence: 0.86 },
    { title: "OEM-spec alternator pulley + harness", priceCents: 12500, shippingCents: 0, condition: "New", thumbnailUrl: PIC("Alt2"), sourceMarketplace: "amazon", listingUrl: "https://amazon.com/dp/example", sellerHandle: "RedlineDirect", sellerLocation: "Phoenix, AZ", specHighlights: { fitment: "2010-2014 GM" }, confidence: 0.81 },
    { title: "Used pull-out alternator, tested good", priceCents: 5500, shippingCents: 1800, condition: "Used", thumbnailUrl: PIC("Alt3"), sourceMarketplace: "facebook", listingUrl: "https://facebook.com/marketplace/item/example", sellerHandle: "yard_finds_az", sellerLocation: "Tucson, AZ", specHighlights: { tested: "Bench test pass" }, confidence: 0.74 },
  ],
  appliance: [
    { title: "Whirlpool washer drive motor (replacement)", priceCents: 8400, shippingCents: 1200, condition: "New", thumbnailUrl: PIC("Motor"), sourceMarketplace: "amazon", listingUrl: "https://amazon.com/dp/example", sellerHandle: "ApplianceDepotUS", sellerLocation: "Memphis, TN", specHighlights: { rpm: "1200", voltage: "120V" }, confidence: 0.83 },
    { title: "OEM washer drum belt set", priceCents: 2500, shippingCents: 800, condition: "New", thumbnailUrl: PIC("Belt"), sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "appliance_belts", sellerLocation: "Nashville, TN", specHighlights: {}, confidence: 0.79 },
    { title: "Refurbished washer control board", priceCents: 11200, shippingCents: 1500, condition: "Refurbished", thumbnailUrl: PIC("Board"), sourceMarketplace: "specialty", listingUrl: "https://repairparts.example.com/1", sellerHandle: "PartsHaven", sellerLocation: "Indianapolis, IN", specHighlights: { warranty: "90 day" }, confidence: 0.7 },
  ],
  woodmetal: [
    { title: "Powermatic 3520B drive belt set", priceCents: 6200, shippingCents: 1100, condition: "New", thumbnailUrl: PIC("Belt"), sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "lathe_parts_pro", sellerLocation: "Portland, OR", specHighlights: {}, confidence: 0.82 },
    { title: "Replacement 4-jaw chuck (1.25\"-8 TPI)", priceCents: 18500, shippingCents: 0, condition: "New", thumbnailUrl: PIC("Chuck"), sourceMarketplace: "amazon", listingUrl: "https://amazon.com/dp/example", sellerHandle: "TurnersCo", sellerLocation: "Boulder, CO", specHighlights: { thread: "1.25\"-8" }, confidence: 0.78 },
  ],
  sewing: [
    { title: "Singer 401A bobbin case (NOS)", priceCents: 3400, shippingCents: 600, condition: "New old stock", thumbnailUrl: PIC("Bobbin"), sourceMarketplace: "etsy", listingUrl: "https://etsy.com/listing/example", sellerHandle: "VintageSewParts", sellerLocation: "Austin, TX", specHighlights: { fits: "401A, 403, 500" }, confidence: 0.84 },
    { title: "Singer feed dogs replacement set", priceCents: 1800, shippingCents: 450, condition: "New", thumbnailUrl: PIC("Feed"), sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "sewparts_us", sellerLocation: "Cleveland, OH", specHighlights: {}, confidence: 0.76 },
  ],
  gaming: [
    { title: "SNES motherboard (1-CHIP-03 revision)", priceCents: 7500, shippingCents: 900, condition: "Tested working", thumbnailUrl: PIC("SNES"), sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "retro_consoles_ny", sellerLocation: "Brooklyn, NY", specHighlights: { revision: "1-CHIP-03", region: "NTSC-U" }, confidence: 0.88 },
    { title: "Replacement 60-pin connector (NES)", priceCents: 1200, shippingCents: 400, condition: "New aftermarket", thumbnailUrl: PIC("60pin"), sourceMarketplace: "mercari", listingUrl: "https://mercari.com/example", sellerHandle: "8bit_repair", sellerLocation: "Sacramento, CA", specHighlights: {}, confidence: 0.71 },
  ],
  photo: [
    { title: "Nikon F3 shutter assembly (parts unit)", priceCents: 4200, shippingCents: 1100, condition: "For parts", thumbnailUrl: PIC("F3"), sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "kameras_de", sellerLocation: "Berlin, DE", specHighlights: {}, confidence: 0.74 },
    { title: "Leica M-mount aperture blade set", priceCents: 9500, shippingCents: 0, condition: "Refurbished", thumbnailUrl: PIC("Aperture"), sourceMarketplace: "specialty", listingUrl: "https://leicarepair.example.com/1", sellerHandle: "OptikRepair", sellerLocation: "Vienna, AT", specHighlights: { mount: "M" }, confidence: 0.8 },
  ],
  audio: [
    { title: "Hammond 1750J output transformer (NOS)", priceCents: 13800, shippingCents: 2000, condition: "New old stock", thumbnailUrl: PIC("Hammond"), sourceMarketplace: "reverb", listingUrl: "https://reverb.com/item/example", sellerHandle: "tube_amp_parts", sellerLocation: "Nashville, TN", specHighlights: { primary: "5K", secondary: "4/8/16Ω" }, confidence: 0.91 },
    { title: "Mercury Magnetics replacement OT", priceCents: 18900, shippingCents: 0, condition: "New", thumbnailUrl: PIC("OT"), sourceMarketplace: "specialty", listingUrl: "https://mercurymagnetics.example.com/1", sellerHandle: "MercuryDirect", sellerLocation: "Chatsworth, CA", specHighlights: { fits: "tweed Champ 5F1" }, confidence: 0.87 },
    { title: "Used Champ output transformer (tested)", priceCents: 6500, shippingCents: 1500, condition: "Used", thumbnailUrl: PIC("Used OT"), sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "vintage_audio_seller", sellerLocation: "Memphis, TN", specHighlights: { tested: "Continuity verified" }, confidence: 0.72 },
  ],
  kitchen: [
    { title: "La Marzocco group head gasket (Linea)", priceCents: 1100, shippingCents: 450, condition: "New", thumbnailUrl: PIC("Gasket"), sourceMarketplace: "specialty", listingUrl: "https://espresso-parts.example.com/1", sellerHandle: "EspressoParts", sellerLocation: "Seattle, WA", specHighlights: { fits: "Linea Classic" }, confidence: 0.89 },
    { title: "Linea Classic shower screen + gasket kit", priceCents: 3500, shippingCents: 600, condition: "New", thumbnailUrl: PIC("Shower"), sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "barista_parts_us", sellerLocation: "Portland, OR", specHighlights: {}, confidence: 0.81 },
  ],
  tools: [
    { title: "Forrest Woodworker II 10\" 40T blade", priceCents: 12900, shippingCents: 0, condition: "New", thumbnailUrl: PIC("Forrest"), sourceMarketplace: "amazon", listingUrl: "https://amazon.com/dp/example", sellerHandle: "ForrestDirect", sellerLocation: "Clifton, NJ", specHighlights: { teeth: "40T" }, confidence: 0.88 },
    { title: "Whiteside 1/2\" carbide router bit set", priceCents: 5400, shippingCents: 700, condition: "New", thumbnailUrl: PIC("Whiteside"), sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "router_bit_pro", sellerLocation: "Greensboro, NC", specHighlights: { shank: "1/2\"" }, confidence: 0.79 },
  ],
  agri: [
    { title: "John Deere injector (5103/5203 series)", priceCents: 22500, shippingCents: 2400, condition: "Reman", thumbnailUrl: PIC("Inj"), sourceMarketplace: "tractorhouse", listingUrl: "https://tractorhouse.example.com/1", sellerHandle: "DeereWorks", sellerLocation: "Ottumwa, IA", specHighlights: { fits: "5103, 5203" }, confidence: 0.85 },
    { title: "JD 30 series header drive belt", priceCents: 8900, shippingCents: 1200, condition: "New", thumbnailUrl: PIC("Belt"), sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "ag_belts_us", sellerLocation: "Lincoln, NE", specHighlights: {}, confidence: 0.78 },
  ],
  marine: [
    { title: "Yamaha F150 water pump kit (2010+)", priceCents: 14500, shippingCents: 0, condition: "OEM", thumbnailUrl: PIC("Pump"), sourceMarketplace: "amazon", listingUrl: "https://amazon.com/dp/example", sellerHandle: "MarineDirect", sellerLocation: "Tampa, FL", specHighlights: { fits: "F150 2010+" }, confidence: 0.86 },
    { title: "Mercury outboard impeller", priceCents: 4200, shippingCents: 800, condition: "New aftermarket", thumbnailUrl: PIC("Impeller"), sourceMarketplace: "ebay", listingUrl: "https://ebay.com/itm/example", sellerHandle: "marine_parts_fl", sellerLocation: "Miami, FL", specHighlights: {}, confidence: 0.77 },
  ],
};

export function fixturesFor(primary: string, sub?: string): MatchFixture[] {
  const list = FIXTURES[primary] ?? [];
  // Sub filter is light — just return all category fixtures for the prototype.
  void sub;
  return list;
}
