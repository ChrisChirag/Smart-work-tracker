import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, rowToProject } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.email;

  const updates = await req.json();
  const dbUpdates: Record<string, unknown> = {};
  if ("name" in updates) dbUpdates.name = updates.name;
  if ("description" in updates) dbUpdates.description = updates.description ?? null;
  if ("color" in updates) dbUpdates.color = updates.color;
  if ("emoji" in updates) dbUpdates.emoji = updates.emoji;

  const { data, error } = await db.from("projects").update(dbUpdates).eq("id", params.id).eq("user_id", uid).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToProject(data));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.email;

  // Unlink tasks that belong to this project
  await db.from("tasks")
    .update({ project_id: null, updated_at: new Date().toISOString() })
    .eq("project_id", params.id)
    .eq("user_id", uid);

  const { error } = await db.from("projects").delete().eq("id", params.id).eq("user_id", uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
