import { createClient } from "@supabase/supabase-js";

// Lazy singleton — only created at request time, not at build time
let _client: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _client;
}

// Untyped client — avoids needing a full Database schema definition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = { from: (table: string) => (getSupabase() as any).from(table) };

export function rowToTask(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    status: row.status as string,
    priority: row.priority as string,
    projectId: row.project_id as string | undefined,
    tagIds: (row.tag_ids as string[]) ?? [],
    dueDate: row.due_date as string | undefined,
    scheduledDate: row.scheduled_date as string | undefined,
    scheduledTime: row.scheduled_time as string | undefined,
    completedAt: row.completed_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function rowToProject(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    color: row.color as string,
    createdAt: row.created_at as string,
  };
}

export function rowToTag(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
  };
}
