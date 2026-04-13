import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, dbError } from "@/lib/api-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: predictions, error } = await supabase
    .from("nba_predictions")
    .select("*")
    .eq("user_id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(predictions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { game_id, predicted_home_score, predicted_away_score } = body;

  if (
    game_id == null ||
    predicted_home_score == null ||
    predicted_away_score == null ||
    !Number.isInteger(predicted_home_score) ||
    !Number.isInteger(predicted_away_score) ||
    predicted_home_score < 0 ||
    predicted_away_score < 0 ||
    predicted_home_score > 300 ||
    predicted_away_score > 300
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Check game exists and not locked
  const { data: game } = await supabase
    .from("nba_games")
    .select("game_date, status")
    .eq("id", game_id)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.status !== "upcoming") {
    return NextResponse.json({ error: "Game already started" }, { status: 400 });
  }

  // Check betting window
  const { data: settings } = await supabase
    .from("nba_settings")
    .select("value")
    .eq("key", "betting_close_minutes")
    .single();

  const closeMinutes = settings?.value ?? 30;
  const gameDate = new Date(game.game_date);
  const lockTime = new Date(gameDate.getTime() - closeMinutes * 60 * 1000);

  if (new Date() >= lockTime) {
    return NextResponse.json(
      { error: "Приём прогнозов закрыт" },
      { status: 400 }
    );
  }

  // Upsert prediction
  const { data, error } = await supabase
    .from("nba_predictions")
    .upsert(
      {
        user_id: session.user.id,
        game_id,
        predicted_home_score,
        predicted_away_score,
      },
      { onConflict: "user_id,game_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate "first prediction" event
  const { data: existingEvent } = await supabase
    .from("nba_events")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("event_type", "first_prediction")
    .single();

  if (!existingEvent) {
    const { data: userData } = await supabase
      .from("nba_users")
      .select("name, display_name")
      .eq("id", session.user.id)
      .single();
    const name = userData?.display_name || userData?.name || "Игрок";
    await supabase.from("nba_events").insert({
      user_id: session.user.id,
      event_type: "first_prediction",
      title: `${name} сделал первый прогноз`,
      icon: "target",
    });
  }

  return NextResponse.json(data);
}
