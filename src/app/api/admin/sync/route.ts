import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: user } = await supabase
    .from("nba_users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.CRON_SECRET || "";

  try {
    // 1. Sync games
    const syncRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002"}/api/cron/sync-games?secret=${encodeURIComponent(secret)}`,
    );
    const syncData = await syncRes.json();

    // 2. Calculate scores
    const calcRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002"}/api/cron/calculate-scores?secret=${encodeURIComponent(secret)}`,
    );
    const calcData = await calcRes.json();

    return NextResponse.json({
      sync: syncData,
      scores: calcData,
    });
  } catch (error) {
    return NextResponse.json({ error: "Sync failed: " + String(error) }, { status: 500 });
  }
}
