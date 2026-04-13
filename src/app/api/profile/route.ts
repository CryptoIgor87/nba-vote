import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("nba_users")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // Avatar upload
    const formData = await req.formData();
    const file = formData.get("avatar") as File;
    const displayName = formData.get("display_name") as string;

    const updates: Record<string, string> = {};

    if (file && file.size > 0) {
      const ext = file.name.split(".").pop();
      const fileName = `${session.user.id}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("nba-avatars")
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: uploadError.message },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("nba-avatars").getPublicUrl(fileName);

      updates.avatar_url = publicUrl;
    }

    if (displayName) {
      updates.display_name = displayName;
    }

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from("nba_users")
        .update(updates)
        .eq("id", session.user.id)
        .select()
        .single();

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    return NextResponse.json({ ok: true });
  }

  // JSON update
  const body = await req.json();
  const { display_name } = body;

  const { data, error } = await supabase
    .from("nba_users")
    .update({ display_name })
    .eq("id", session.user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
