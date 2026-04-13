import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("nba_mvp_predictions")
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
      { error: "Турнир уже начался, ставка на MVP закрыта" },
      { status: 400 }
    );
  }

  const { player_name, team_id } = await req.json();
  if (!player_name) {
    return NextResponse.json({ error: "Missing player_name" }, { status: 400 });
  }

  // Check if already exists
  const { data: existing } = await supabase
    .from("nba_mvp_predictions")
    .select("id")
    .eq("user_id", session.user.id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Вы уже сделали прогноз на MVP" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("nba_mvp_predictions")
    .insert({ user_id: session.user.id, player_name, team_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
