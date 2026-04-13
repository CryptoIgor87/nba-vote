import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { requireAuth, requireAdmin, rateLimit, sanitizeText, dbError } from "@/lib/api-utils";

export async function GET() {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { data: messages, error } = await supabase
    .from("nba_messages")
    .select("*")
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return dbError();

  const { data: replies } = await supabase
    .from("nba_messages")
    .select("*")
    .not("parent_id", "is", null)
    .order("created_at", { ascending: true });

  const allUserIds = new Set<string>();
  messages?.forEach((m) => allUserIds.add(m.user_id));
  replies?.forEach((r) => allUserIds.add(r.user_id));

  const { data: users } = await supabase
    .from("nba_users")
    .select("id, name, display_name, image, avatar_url")
    .in("id", [...allUserIds]);

  const usersMap = new Map(users?.map((u) => [u.id, u]));

  const replyMap = new Map<string, typeof replies>();
  replies?.forEach((r) => {
    const arr = replyMap.get(r.parent_id) || [];
    arr.push({ ...r, user: usersMap.get(r.user_id) });
    replyMap.set(r.parent_id, arr);
  });

  const enriched = messages?.map((m) => ({
    ...m,
    user: usersMap.get(m.user_id),
    replies: replyMap.get(m.id) || [],
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 1 message per 3 seconds per user
  if (!rateLimit(`chat:${session.user.id}`, 1, 3000)) {
    return NextResponse.json({ error: "Слишком быстро" }, { status: 429 });
  }

  const { text, parent_id } = await req.json();
  const cleanText = sanitizeText(text || "", 1000);

  if (cleanText.length === 0) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("nba_messages")
    .insert({
      user_id: session.user.id,
      parent_id: parent_id || null,
      text: cleanText,
    })
    .select()
    .single();

  if (error) return dbError();
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await supabase.from("nba_messages").delete().eq("parent_id", id);
  await supabase.from("nba_messages").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
