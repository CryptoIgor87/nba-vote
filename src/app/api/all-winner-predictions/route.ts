import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // Show all winner predictions (visible after tournament starts)
  const { data: startedGames } = await supabase
    .from("nba_games")
    .select("id")
    .neq("status", "upcoming")
    .limit(1);

  // Only show after at least one game has started
  if (!startedGames || startedGames.length === 0) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("nba_winner_predictions")
    .select("user_id, team_id, points_earned");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
