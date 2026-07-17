import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { TodoData, TodoProject, TodoTask } from "@/lib/todoTypes";

export async function GET() {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [projectsResult, tasksResult] = await Promise.all([
    supabaseAdmin.from("todo_projects").select("*").order("created_at", { ascending: true }),
    supabaseAdmin
      .from("todo_tasks")
      .select("*")
      .order("is_completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  const error = projectsResult.error || tasksResult.error;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const body: TodoData = {
    projects: (projectsResult.data || []) as TodoProject[],
    tasks: (tasksResult.data || []) as TodoTask[],
  };
  return NextResponse.json(body);
}
