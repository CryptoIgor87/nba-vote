import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: leaderboard, error } = await supabase
    .from("nba_leaderboard")
    .select("*")
    .order("total_points", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Join with users
  const userIds = leaderboard?.map((l) => l.user_id) || [];
  const { data: users } = await supabase
    .from("nba_users")
    .select("id, name, display_name, image, avatar_url")
    .in("id", userIds);

  const usersMap = new Map(users?.map((u) => [u.id, u]));

  const enriched = leaderboard?.map((entry) => ({
    ...entry,
    user: usersMap.get(entry.user_id),
  }));

  return NextResponse.json(enriched);
}
