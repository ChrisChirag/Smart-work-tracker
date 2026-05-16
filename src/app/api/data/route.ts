import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, rowToTask, rowToProject, rowToTag } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.email;

  const [{ data: tasks }, { data: projects }, { data: tags }] = await Promise.all([
    db.from("tasks").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
    db.from("projects").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
    db.from("tags").select("*").eq("user_id", uid),
  ]);

  return NextResponse.json({
    tasks: (tasks ?? []).map(rowToTask),
    projects: (projects ?? []).map(rowToProject),
    tags: (tags ?? []).map(rowToTag),
  });
}
