import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

async function isAdmin() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "ADMIN";
}

export async function GET() {
  const { data, error } = await supabase
    .from("nba_settings")
    .select("*")
    .order("key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { settings } = body as { settings: { key: string; value: number }[] };

  for (const s of settings) {
    await supabase
      .from("nba_settings")
      .update({ value: s.value })
      .eq("key", s.key);
  }

  return NextResponse.json({ ok: true });
}
