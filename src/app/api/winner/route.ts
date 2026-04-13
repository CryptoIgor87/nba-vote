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

  return NextResponse.json(data);
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
    return NextResponse.json(
      { error: "Турнир уже начался, ставка на победителя закрыта" },
      { status: 400 }
    );
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
