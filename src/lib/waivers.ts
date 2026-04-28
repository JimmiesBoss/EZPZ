export interface Waiver {
  id: string;
  categoryId: string;
  version: string;
  title: string;
  body: string;
}

const generic = (
  category: string,
  hazardLine: string
) => `By submitting this request you acknowledge that:

• Widgeter sources replacement components only — installation and integration are your responsibility (or the responsibility of a qualified technician).
• ${hazardLine}
• You have a 14-day buyer-verification window from delivery to confirm the part matches your specification. After that window, the order is considered accepted and the seller payout is released on Net 30.
• The non-refundable service fee is captured at the moment of approval and is not returned for buyer's-remorse cancellations.
• The platform will not be liable for downstream damages, downtime, or consequential losses arising from the use of the part.

This waiver applies specifically to ${category}.`;

export const WAIVERS: Record<string, Waiver> = {
  "automotive-v1": {
    id: "automotive-v1", categoryId: "automotive", version: "1.0",
    title: "Automotive parts — installer responsibility",
    body: generic("Automotive Parts", "Installation risk shifts to the mechanic or DIY installer upon receipt; the platform makes no warranty on post-installation functionality."),
  },
  "appliance-v1": {
    id: "appliance-v1", categoryId: "appliance", version: "1.0",
    title: "Small appliance parts — electrical & fire risk",
    body: generic("Small Appliance Parts", "You assume full responsibility for electrical, fire, and mechanical risks resulting from improper installation."),
  },
  "woodmetal-v1": {
    id: "woodmetal-v1", categoryId: "woodmetal", version: "1.0",
    title: "Woodworking & metalworking — personal injury risk",
    body: generic("Woodworking & Metalworking Equipment", "You acknowledge the risk of personal injury from installed parts and accept responsibility for safe operation, testing, and maintenance."),
  },
  "sewing-v1": {
    id: "sewing-v1", categoryId: "sewing", version: "1.0",
    title: "Sewing & textile equipment — operator responsibility",
    body: generic("Sewing & Textile Equipment", "Tailor or operator assumes full responsibility for integration and safe operation."),
  },
  "gaming-v1": {
    id: "gaming-v1", categoryId: "gaming", version: "1.0",
    title: "Gaming & arcade equipment — fraud-aware acceptance",
    body: generic("Gaming & Arcade Equipment", "Fraud risk (swapped ROMs, fraudulent boards) is mitigated by mandatory video proof of functionality before sourcing; the platform is not liable for ROM authenticity, board internals, or software integrity post-delivery."),
  },
  "photo-v1": {
    id: "photo-v1", categoryId: "photo", version: "1.0",
    title: "Vintage photography — authenticity caveats",
    body: generic("Vintage Photography Equipment", "Counterfeit lens elements and fake NOS components exist; you accept responsibility for compatibility, authenticity verification, and installation."),
  },
  "audio-v1": {
    id: "audio-v1", categoryId: "audio", version: "1.0",
    title: "Vintage audio & hi-fi — NOS component variance",
    body: generic("Vintage Audio & Hi-Fi Equipment", "NOS tubes and vintage capacitors vary in quality; you accept responsibility for verifying specifications and electrical characteristics before installation."),
  },
  "kitchen-v1": {
    id: "kitchen-v1", categoryId: "kitchen", version: "1.0",
    title: "Commercial kitchen — food safety & warranty",
    body: generic("Commercial Kitchen & Cafe Equipment", "Food-safety, regulatory compliance, and warranty implications are the operator's responsibility; non-OEM parts may void manufacturer warranties."),
  },
  "tools-v1": {
    id: "tools-v1", categoryId: "tools", version: "1.0",
    title: "Small tools — installation & use",
    body: generic("Small Tools & Hand Tools", "You assume responsibility for proper installation, fit, safe operation, and maintenance."),
  },
  "agri-v1": {
    id: "agri-v1", categoryId: "agri", version: "1.0",
    title: "Agricultural equipment — downtime & crop loss disclaimer",
    body: generic("Agricultural Equipment Parts", "The platform is not liable for equipment downtime, crop loss, or operational failure resulting from installed parts."),
  },
  "marine-v1": {
    id: "marine-v1", categoryId: "marine", version: "1.0",
    title: "Marine equipment — operational responsibility at sea",
    body: generic("Marine & Boating Equipment", "You assume full responsibility for compatibility, installation, and safe operation; the platform is not liable for equipment failure at sea or downstream safety hazards."),
  },
};

export function getWaiverForCategory(categoryId: string): Waiver | undefined {
  return Object.values(WAIVERS).find((w) => w.categoryId === categoryId);
}
