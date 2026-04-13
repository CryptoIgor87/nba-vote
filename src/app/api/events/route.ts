import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: events, error } = await supabase
    .from("nba_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set(events?.map((e) => e.user_id) || [])];
  const { data: users } = await supabase
    .from("nba_users")
    .select("id, name, display_name, image, avatar_url")
    .in("id", userIds);

  const usersMap = new Map(users?.map((u) => [u.id, u]));

  const enriched = events?.map((e) => ({
    ...e,
    user: usersMap.get(e.user_id),
  }));

  return NextResponse.json(enriched);
}
