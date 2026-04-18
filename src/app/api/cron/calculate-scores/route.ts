import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { recalculateScores } from "@/lib/scoring";
import { verifySecret } from "@/lib/api-utils";

let isRunning = false;

export async function GET(req: NextRequest) {
  if (!verifySecret(req.nextUrl.searchParams.get("secret"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isRunning) {
    return NextResponse.json({ skipped: true, reason: "already running" });
  }

  isRunning = true;
  try {
    await recalculateScores();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Score calculation error:", error);
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  } finally {
    isRunning = false;
  }
}
