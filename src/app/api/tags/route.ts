import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, rowToTag } from "@/lib/supabase";
import type { Tag } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.email;

  const tag: Tag = await req.json();
  const { data, error } = await db.from("tags").insert({
    id: tag.id,
    user_id: uid,
    name: tag.name,
    color: tag.color,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToTag(data));
}
