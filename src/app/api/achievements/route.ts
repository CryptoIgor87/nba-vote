import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");

  // Get all achievements
  const { data: achievements } = await supabase
    .from("nba_achievements")
    .select("*")
    .order("sort_order");

  // Get user's unlocked achievements
  let unlocked: { achievement_id: string; unlocked_at: string }[] = [];
  if (userId) {
    const { data } = await supabase
      .from("nba_user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", userId);
    unlocked = data || [];
  }

  const unlockedMap = new Map(
    unlocked.map((u) => [u.achievement_id, u.unlocked_at])
  );

  const result = achievements?.map((a) => ({
    ...a,
    unlocked: unlockedMap.has(a.id),
    unlocked_at: unlockedMap.get(a.id) || null,
  }));

  return NextResponse.json(result);
}
