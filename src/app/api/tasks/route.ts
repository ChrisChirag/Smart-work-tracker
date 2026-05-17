import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, rowToTask } from "@/lib/supabase";
import type { Task } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.email;

  const task: Task = await req.json();
  const row = {
    id: task.id,
    user_id: uid,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    project_id: task.projectId ?? null,
    tag_ids: task.tagIds ?? [],
    due_date: task.dueDate ?? null,
    scheduled_date: task.scheduledDate ?? null,
    scheduled_time: task.scheduledTime ?? null,
    pinned_time: task.pinnedTime ?? false,
    estimated_minutes: task.estimatedMinutes ?? null,
    completed_at: task.completedAt ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };

  // Use upsert so that re-sync calls (local-only tasks being re-posted on load)
  // never collide with rows that already exist, avoiding spurious error toasts.
  const { data, error } = await db.from("tasks")
    .upsert(row, { onConflict: "id", ignoreDuplicates: false })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: true }); // row existed, no-op
  return NextResponse.json(rowToTask(data));
}
