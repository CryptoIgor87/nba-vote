import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const round = req.nextUrl.searchParams.get("round");

  let query = supabase
    .from("nba_games")
    .select("*")
    .order("game_date", { ascending: true });

  if (round) {
    query = query.eq("round", round);
  }

  const { data: games, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch teams
  const { data: teams } = await supabase.from("nba_teams").select("*");
  const teamsMap = new Map(teams?.map((t) => [t.id, t]));

  const enriched = games?.map((g) => ({
    ...g,
    home_team: teamsMap.get(g.home_team_id),
    away_team: teamsMap.get(g.away_team_id),
  }));

  return NextResponse.json(enriched);
}
