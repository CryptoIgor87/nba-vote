import { NextRequest, NextResponse } from "next/server";
import { recalculateScores } from "@/lib/scoring";
import { verifySecret } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  if (!verifySecret(req.nextUrl.searchParams.get("secret"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await recalculateScores();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Score calculation error:", error);
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
