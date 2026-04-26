import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "NOT_IMPLEMENTED", message: "Approval lands in Phase 8." },
    { status: 501 }
  );
}
