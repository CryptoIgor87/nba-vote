import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();

  const today = new Date().toISOString().split("T")[0];

  // Get all active questions (today and future)
  const { data: questions } = await supabase
    .from("nba_daily_questions")
    .select(
      "*, game:nba_games!nba_daily_questions_game_id_fkey(*, home_team:nba_teams!nba_games_home_team_id_fkey(*), away_team:nba_teams!nba_games_away_team_id_fkey(*))"
    )
    .gte("question_date", today)
    .order("question_date", { ascending: true });

  if (!questions || questions.length === 0) {
    return NextResponse.json({ questions: [], picks: {} });
  }

  // Get user's picks for all questions
  const picks: Record<string, unknown> = {};
  if (session?.user?.id) {
    const qIds = questions.map((q) => q.id);
    const { data } = await supabase
      .from("nba_daily_picks")
      .select("*")
      .eq("user_id", session.user.id)
      .in("question_id", qIds);

    for (const p of data || []) {
      picks[p.question_id] = p;
    }
  }

  // Get pick counts for resolved questions
  const pickCounts: Record<string, Record<string, number>> = {};
  const resolvedIds = questions.filter((q) => q.status === "resolved").map((q) => q.id);
  if (resolvedIds.length > 0) {
    const { data: allPicks } = await supabase
      .from("nba_daily_picks")
      .select("question_id, picked_option")
      .in("question_id", resolvedIds);

    for (const p of allPicks || []) {
      if (!pickCounts[p.question_id]) pickCounts[p.question_id] = {};
      pickCounts[p.question_id][p.picked_option] = (pickCounts[p.question_id][p.picked_option] || 0) + 1;
    }
  }

  return NextResponse.json({ questions, picks, pickCounts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { question_id, picked_option } = body;

  if (!question_id || !picked_option) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Get question with game data
  const { data: question } = await supabase
    .from("nba_daily_questions")
    .select("*, game:nba_games!nba_daily_questions_game_id_fkey(game_date, status)")
    .eq("id", question_id)
    .single();

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  if (question.status === "resolved") {
    return NextResponse.json({ error: "Вопрос уже закрыт" }, { status: 400 });
  }

  // Validate picked_option
  const validOptions = [
    question.player1_name,
    question.player2_name,
    question.player3_name,
    question.player4_name,
    "other",
  ];
  if (!validOptions.includes(picked_option)) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }

  // Check betting window
  const game = question.game as { game_date: string; status: string };
  if (game.status !== "upcoming") {
    return NextResponse.json({ error: "Матч уже начался" }, { status: 400 });
  }

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

  // Upsert pick
  const { data, error } = await supabase
    .from("nba_daily_picks")
    .upsert(
      {
        user_id: session.user.id,
        question_id,
        picked_option,
      },
      { onConflict: "user_id,question_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
