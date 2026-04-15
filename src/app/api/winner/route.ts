import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("nba_winner_predictions")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  // Check if user is new (< 24h) — they get extra time to pick
  const { data: user } = await supabase
    .from("nba_users")
    .select("created_at")
    .eq("id", session.user.id)
    .single();

  const createdAt = user?.created_at ? new Date(user.created_at) : new Date(0);
  const deadline = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
  const isNewUser = Date.now() < deadline.getTime();

  return NextResponse.json({ prediction: data, isNewUser, newUserDeadline: isNewUser ? deadline.toISOString() : null });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if any games have started
  const { data: startedGames } = await supabase
    .from("nba_games")
    .select("id")
    .neq("status", "upcoming")
    .limit(1);

  if (startedGames && startedGames.length > 0) {
    // Allow new users (registered < 24h ago) to still pick
    const { data: user } = await supabase
      .from("nba_users")
      .select("created_at")
      .eq("id", session.user.id)
      .single();

    const createdAt = user?.created_at ? new Date(user.created_at) : new Date(0);
    const hoursSinceRegistration = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceRegistration > 24) {
      return NextResponse.json(
        { error: "Турнир уже начался, ставка на победителя закрыта" },
        { status: 400 }
      );
    }
  }

  const { team_id } = await req.json();
  if (!team_id) {
    return NextResponse.json({ error: "Missing team_id" }, { status: 400 });
  }

  // Upsert — allow changing until first game starts
  const { data, error } = await supabase
    .from("nba_winner_predictions")
    .upsert(
      { user_id: session.user.id, team_id },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
