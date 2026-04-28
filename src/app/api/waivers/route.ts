import { NextRequest, NextResponse } from "next/server";
import { getWaiverForCategory } from "@/lib/waivers";

export async function GET(req: NextRequest) {
  const cat = req.nextUrl.searchParams.get("category") ?? "";
  const waiver = getWaiverForCategory(cat);
  if (!waiver) return NextResponse.json({ waiver: null });
  return NextResponse.json({ waiver });
}
