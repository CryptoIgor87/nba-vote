import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // Get ALL users, not just those in leaderboard
  const { data: users, error: usersError } = await supabase
    .from("nba_users")
    .select("id, name, display_name, image, avatar_url");

  if (usersError)
    return NextResponse.json({ error: usersError.message }, { status: 500 });

  const { data: leaderboard } = await supabase
    .from("nba_leaderboard")
    .select("*");

  const lbMap = new Map(leaderboard?.map((l) => [l.user_id, l]));

  // Merge: all users with their leaderboard data (or zeros)
  const entries = (users || []).map((user) => {
    const lb = lbMap.get(user.id);
    return {
      user_id: user.id,
      total_points: lb?.total_points ?? 0,
      correct_winners: lb?.correct_winners ?? 0,
      correct_series: lb?.correct_series ?? 0,
      total_predictions: lb?.total_predictions ?? 0,
      user,
    };
  });

  entries.sort((a, b) => b.total_points - a.total_points);

  return NextResponse.json(entries);
}
