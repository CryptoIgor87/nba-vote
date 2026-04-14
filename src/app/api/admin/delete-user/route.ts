import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, dbError } from "@/lib/api-utils";
import { supabase } from "@/lib/supabase";

export async function DELETE(req: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { user_id } = await req.json();
  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  // Don't allow deleting yourself
  const { session } = await requireAdmin();
  if (session?.user?.id === user_id) {
    return NextResponse.json({ error: "Нельзя удалить свой аккаунт" }, { status: 400 });
  }

  try {
    // Delete in order (foreign keys): bonuses, predictions, events, messages, achievements, then user
    await supabase.from("nba_bonuses").delete().eq("user_id", user_id);
    await supabase.from("nba_series_bonuses").delete().eq("user_id", user_id);
    await supabase.from("nba_predictions").delete().eq("user_id", user_id);
    await supabase.from("nba_series_predictions").delete().eq("user_id", user_id);
    await supabase.from("nba_winner_predictions").delete().eq("user_id", user_id);
    await supabase.from("nba_mvp_predictions").delete().eq("user_id", user_id);
    await supabase.from("nba_user_achievements").delete().eq("user_id", user_id);
    await supabase.from("nba_events").delete().eq("user_id", user_id);
    await supabase.from("nba_leaderboard").delete().eq("user_id", user_id);
    await supabase.from("nba_messages").delete().eq("user_id", user_id);
    await supabase.from("nba_sessions").delete().eq("user_id", user_id);
    await supabase.from("nba_accounts").delete().eq("user_id", user_id);
    await supabase.from("nba_users").delete().eq("id", user_id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return dbError();
  }
}
