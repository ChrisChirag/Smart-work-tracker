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
  const { data, error } = await db.from("tasks").insert({
    id: task.id,
    user_id: uid,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    project_id: task.projectId ?? null,
    tag_ids: task.tagIds,
    due_date: task.dueDate ?? null,
    scheduled_date: task.scheduledDate ?? null,
    completed_at: task.completedAt ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToTask(data));
}
