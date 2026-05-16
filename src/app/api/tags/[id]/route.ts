import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/supabase";

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.email;

  // Remove this tag from every task that references it
  const { data: affected } = await db.from("tasks")
    .select("id, tag_ids")
    .eq("user_id", uid)
    .contains("tag_ids", [params.id]);

  if (affected && affected.length > 0) {
    await Promise.all(
      affected.map((row: { id: string; tag_ids: string[] }) =>
        db.from("tasks")
          .update({
            tag_ids: row.tag_ids.filter((tid: string) => tid !== params.id),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)
          .eq("user_id", uid)
      )
    );
  }

  const { error } = await db.from("tags").delete().eq("id", params.id).eq("user_id", uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
