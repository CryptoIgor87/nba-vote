import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchPlayoffGames } from "@/lib/balldontlie";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch games for a wide range around current date
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 2);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 14);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const games = await fetchPlayoffGames(
      formatDate(startDate),
      formatDate(endDate)
    );

    let synced = 0;

    for (const game of games) {
      const gameStatus =
        game.status === "Final"
          ? "finished"
          : game.status === "In Progress"
          ? "in_progress"
          : "upcoming";

      const { error } = await supabase.from("nba_games").upsert(
        {
          id: game.id,
          season: game.season,
          status: gameStatus,
          home_team_id: game.home_team.id,
          away_team_id: game.visitor_team.id,
          home_score:
            game.home_team_score > 0 ? game.home_team_score : null,
          away_score:
            game.visitor_team_score > 0 ? game.visitor_team_score : null,
          game_date: game.date,
          is_playoff: game.postseason,
          round: game.postseason ? "first_round" : null,
        },
        { onConflict: "id" }
      );

      if (!error) synced++;
    }

    // Update series based on finished games
    await updateSeriesFromGames();

    return NextResponse.json({ synced, total: games.length });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}

async function updateSeriesFromGames() {
  // Get all series with their games
  const { data: series } = await supabase
    .from("nba_series")
    .select("*")
    .neq("status", "finished");

  if (!series) return;

  for (const s of series) {
    const { data: games } = await supabase
      .from("nba_games")
      .select("*")
      .eq("series_id", s.id)
      .eq("status", "finished");

    if (!games || games.length === 0) continue;

    let homeWins = 0;
    let awayWins = 0;

    for (const g of games) {
      if (g.home_score > g.away_score) {
        if (g.home_team_id === s.team_home_id) homeWins++;
        else awayWins++;
      } else {
        if (g.away_team_id === s.team_home_id) homeWins++;
        else awayWins++;
      }
    }

    const winsNeeded = s.round === "play_in" ? 1 : 4;
    const winnerId =
      homeWins >= winsNeeded
        ? s.team_home_id
        : awayWins >= winsNeeded
        ? s.team_away_id
        : null;

    await supabase
      .from("nba_series")
      .update({
        home_wins: homeWins,
        away_wins: awayWins,
        winner_id: winnerId,
        status: winnerId ? "finished" : "active",
      })
      .eq("id", s.id);
  }
}
