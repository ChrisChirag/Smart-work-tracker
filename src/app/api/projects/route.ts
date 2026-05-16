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
  const { data, error } = await db.from("projects").insert({
    id: project.id,
    user_id: uid,
    name: project.name,
    description: project.description ?? null,
    color: project.color,
    emoji: project.emoji,
    created_at: project.createdAt,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToProject(data));
}
