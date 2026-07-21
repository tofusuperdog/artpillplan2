import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { TodoPriority, TodoProjectColor } from "@/lib/todoTypes";

type SaveTaskInput = { id?: string; projectId: string; title: string; dueDate?: string | null; priority: TodoPriority };
type ActionBody =
  | { action: "save_project"; input: { id?: string; name: string; color: TodoProjectColor } }
  | { action: "delete_project"; input: { id: string } }
  | { action: "save_task"; input: SaveTaskInput }
  | { action: "toggle_task"; input: { id: string; completed: boolean } }
  | { action: "delete_task"; input: { id: string } }
  | { action: "delete_completed"; input: Record<string, never> };

const COLORS: TodoProjectColor[] = ["amber", "red", "green", "blue", "purple"];
const PRIORITIES: TodoPriority[] = ["low", "medium", "high"];

export async function POST(request: Request) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as ActionBody | null;
  if (!body) return NextResponse.json({ message: "Invalid request." }, { status: 400 });

  try {
    if (body.action === "save_project") await saveProject(body.input);
    if (body.action === "delete_project") await deleteRow("todo_projects", body.input.id);
    if (body.action === "save_task") await saveTask(body.input);
    if (body.action === "toggle_task") await toggleTask(body.input.id, body.input.completed);
    if (body.action === "delete_task") await deleteRow("todo_tasks", body.input.id);
    if (body.action === "delete_completed") await deleteCompletedTasks();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Action failed." }, { status: 500 });
  }
}

async function saveProject(input: { id?: string; name: string; color: TodoProjectColor }) {
  const name = input.name?.trim();
  if (!name || name.length > 60) throw new Error("Project name must be 1-60 characters.");
  if (!COLORS.includes(input.color)) throw new Error("Project color is invalid.");
  const payload = { name, color: input.color, updated_at: new Date().toISOString() };
  const query = input.id
    ? supabaseAdmin.from("todo_projects").update(payload).eq("id", input.id)
    : supabaseAdmin.from("todo_projects").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

async function saveTask(input: SaveTaskInput) {
  const title = input.title?.trim();
  if (!title || title.length > 160) throw new Error("Task title must be 1-160 characters.");
  if (!input.projectId) throw new Error("Please select a project.");
  if (!PRIORITIES.includes(input.priority)) throw new Error("Priority is invalid.");
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new Error("Deadline is invalid.");

  const payload = {
    project_id: input.projectId,
    title,
    due_date: input.dueDate || null,
    priority: input.priority,
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? supabaseAdmin.from("todo_tasks").update(payload).eq("id", input.id)
    : supabaseAdmin.from("todo_tasks").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

async function toggleTask(id: string, completed: boolean) {
  if (!id) throw new Error("Task is required.");
  const { error } = await supabaseAdmin.from("todo_tasks").update({
    is_completed: completed,
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

async function deleteRow(table: "todo_projects" | "todo_tasks", id: string) {
  if (!id) throw new Error("Record is required.");
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

async function deleteCompletedTasks() {
  const { error } = await supabaseAdmin.from("todo_tasks").delete().eq("is_completed", true);
  if (error) throw new Error(error.message);
}
