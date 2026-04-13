import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: series, error } = await supabase
    .from("nba_series")
    .select("*")
    .order("round")
    .order("series_number");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: teams } = await supabase.from("nba_teams").select("*");
  const teamsMap = new Map(teams?.map((t) => [t.id, t]));

  const enriched = series?.map((s) => ({
    ...s,
    home_team: s.team_home_id ? teamsMap.get(s.team_home_id) : null,
    away_team: s.team_away_id ? teamsMap.get(s.team_away_id) : null,
    winner_team: s.winner_id ? teamsMap.get(s.winner_id) : null,
  }));

  return NextResponse.json(enriched);
}
