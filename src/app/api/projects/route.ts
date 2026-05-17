import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, rowToProject } from "@/lib/supabase";
import type { Project } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.email;

  const project: Project = await req.json();
  const row = {
    id: project.id,
    user_id: uid,
    name: project.name,
    description: project.description ?? null,
    color: project.color,
    emoji: "",
    created_at: project.createdAt,
  };

  // Upsert so re-sync on load never produces "duplicate key" error toasts.
  const { data, error } = await db.from("projects")
    .upsert(row, { onConflict: "id", ignoreDuplicates: false })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: true });
  return NextResponse.json(rowToProject(data));
}
