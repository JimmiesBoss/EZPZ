import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/categories";

export async function GET() {
  return NextResponse.json({
    categories: CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      tier: c.tier,
      description: c.description,
      subcategories: c.subcategories.map((s) => ({ id: s.id, label: s.label })),
    })),
  });
}
