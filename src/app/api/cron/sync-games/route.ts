import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchPlayoffGames } from "@/lib/balldontlie";
import { verifySecret } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!verifySecret(secret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startDate = new Date("2026-04-01");
    const endDate = new Date("2026-07-01");
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

      const gameDate = (game as unknown as { datetime?: string }).datetime || game.date;

      // Check if game already exists to preserve its round
      const { data: existing } = await supabase
        .from("nba_games")
        .select("round")
        .eq("id", game.id)
        .single();

      // Guard against duplicates: the API occasionally returns a different id
      // for the same matchup+date (e.g. play-in games). If we find one, update
      // the existing row's score/status instead of creating a new one.
      if (!existing) {
        const dayStart = new Date(new Date(gameDate).getTime() - 12 * 60 * 60 * 1000).toISOString();
        const dayEnd = new Date(new Date(gameDate).getTime() + 12 * 60 * 60 * 1000).toISOString();
        const { data: dup } = await supabase
          .from("nba_games")
          .select("id")
          .eq("home_team_id", game.home_team.id)
          .eq("away_team_id", game.visitor_team.id)
          .gte("game_date", dayStart)
          .lte("game_date", dayEnd)
          .maybeSingle();
        if (dup) {
          // Propagate score/status from the API duplicate to our existing row
          await supabase.from("nba_games").update({
            status: gameStatus,
            home_score: game.home_team_score > 0 ? game.home_team_score : null,
            away_score: game.visitor_team_score > 0 ? game.visitor_team_score : null,
          }).eq("id", dup.id);
          synced++;
          continue;
        }
      }

      const round = existing?.round || (game.postseason ? "first_round" : null);

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
          game_date: gameDate,
          is_playoff: game.postseason || !!existing,
          round,
        },
        { onConflict: "id" }
      );

      if (!error) synced++;
    }

    await autoCreateSeriesForOrphanGames();
    await updateSeriesFromGames();

    return NextResponse.json({ synced, total: games.length });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

/**
 * Auto-create series for first_round games that don't have series_id yet.
 * Groups games by matchup (home+away combination) and creates a series.
 */
async function autoCreateSeriesForOrphanGames() {
  const { data: orphanGames } = await supabase
    .from("nba_games")
    .select("*")
    .is("series_id", null)
    .eq("round", "first_round")
    .eq("is_playoff", true);

  if (!orphanGames || orphanGames.length === 0) return;

  const { data: teams } = await supabase.from("nba_teams").select("id, conference");
  const teamConference = new Map(teams?.map((t) => [t.id, t.conference]));

  // Group by matchup (team pair)
  const matchups = new Map<string, typeof orphanGames>();
  for (const g of orphanGames) {
    const key = [g.home_team_id, g.away_team_id].sort().join("-");
    if (!matchups.has(key)) matchups.set(key, []);
    matchups.get(key)!.push(g);
  }

  for (const [key, games] of matchups) {
    const [teamA, teamB] = key.split("-").map(Number);

    // Check if series already exists for this matchup
    const { data: existingSeries } = await supabase
      .from("nba_series")
      .select("id")
      .eq("round", "first_round")
      .or(
        `and(team_home_id.eq.${teamA},team_away_id.eq.${teamB}),and(team_home_id.eq.${teamB},team_away_id.eq.${teamA})`
      )
      .maybeSingle();

    let seriesId = existingSeries?.id;

    if (!seriesId) {
      // Pick team with earliest home game as "home team" of series (higher seed)
      games.sort((a, b) => a.game_date.localeCompare(b.game_date));
      const firstGame = games[0];
      const seriesHome = firstGame.home_team_id;
      const seriesAway = firstGame.away_team_id;
      const conference = teamConference.get(seriesHome) || null;

      const { data: newSeries, error: createError } = await supabase
        .from("nba_series")
        .insert({
          round: "first_round",
          conference,
          team_home_id: seriesHome,
          team_away_id: seriesAway,
          status: "upcoming",
        })
        .select()
        .single();

      if (createError) {
        console.error("Series create error:", createError);
        continue;
      }
      seriesId = newSeries.id;
    }

    // Link all games to this series
    const gameIds = games.map((g) => g.id);
    await supabase
      .from("nba_games")
      .update({ series_id: seriesId })
      .in("id", gameIds);
  }
}

async function updateSeriesFromGames() {
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
