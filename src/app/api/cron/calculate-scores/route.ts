import { NextRequest, NextResponse } from "next/server";
import { recalculateScores } from "@/lib/scoring";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await recalculateScores();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Score calculation error:", error);
    return NextResponse.json(
      { error: "Calculation failed", details: String(error) },
      { status: 500 }
    );
  }
}
