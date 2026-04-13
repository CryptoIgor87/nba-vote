import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("nba_series_predictions")
    .select("*")
    .eq("user_id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { series_id, predicted_winner_id, predicted_home_wins, predicted_away_wins } =
    await req.json();

  if (!series_id || !predicted_winner_id || predicted_home_wins == null || predicted_away_wins == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Check series exists and hasn't started
  const { data: seriesData } = await supabase
    .from("nba_series")
    .select("*")
    .eq("id", series_id)
    .single();

  if (!seriesData) {
    return NextResponse.json({ error: "Series not found" }, { status: 404 });
  }

  // Check if any games in this series have started
  const { data: startedGames } = await supabase
    .from("nba_games")
    .select("id")
    .eq("series_id", series_id)
    .neq("status", "upcoming")
    .limit(1);

  if (startedGames && startedGames.length > 0) {
    return NextResponse.json(
      { error: "Серия уже началась, прогноз закрыт" },
      { status: 400 }
    );
  }

  // Validate: winner must have 4 wins, total must be valid
  const winnerIsHome = predicted_winner_id === seriesData.team_home_id;
  const winnerWins = winnerIsHome ? predicted_home_wins : predicted_away_wins;
  const loserWins = winnerIsHome ? predicted_away_wins : predicted_home_wins;

  if (winnerWins !== 4 || loserWins < 0 || loserWins > 3) {
    return NextResponse.json(
      { error: "Победитель должен иметь 4 победы, проигравший 0-3" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("nba_series_predictions")
    .upsert(
      {
        user_id: session.user.id,
        series_id,
        predicted_winner_id,
        predicted_home_wins,
        predicted_away_wins,
      },
      { onConflict: "user_id,series_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
