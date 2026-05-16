import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, rowToTask } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.email;

  const updates = await req.json();
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("title" in updates) dbUpdates.title = updates.title;
  if ("description" in updates) dbUpdates.description = updates.description ?? null;
  if ("status" in updates) dbUpdates.status = updates.status;
  if ("priority" in updates) dbUpdates.priority = updates.priority;
  if ("projectId" in updates) dbUpdates.project_id = updates.projectId ?? null;
  if ("tagIds" in updates) dbUpdates.tag_ids = updates.tagIds;
  if ("dueDate" in updates) dbUpdates.due_date = updates.dueDate ?? null;
  if ("scheduledDate" in updates) dbUpdates.scheduled_date = updates.scheduledDate ?? null;
  if ("completedAt" in updates) dbUpdates.completed_at = updates.completedAt ?? null;

  const { data, error } = await db.from("tasks").update(dbUpdates).eq("id", params.id).eq("user_id", uid).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToTask(data));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.email;

  const { error } = await db.from("tasks").delete().eq("id", params.id).eq("user_id", uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
