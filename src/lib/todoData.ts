import type { TodoData, TodoPriority, TodoProjectColor } from "./todoTypes";

async function todoApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function loadTodoData() {
  return todoApi<TodoData>("/api/todo/data");
}

export function saveTodoProject(input: { id?: string; name: string; color: TodoProjectColor }) {
  return todoApi<{ ok: true }>("/api/todo/action", {
    method: "POST",
    body: JSON.stringify({ action: "save_project", input }),
  });
}

export function deleteTodoProject(id: string) {
  return todoApi<{ ok: true }>("/api/todo/action", {
    method: "POST",
    body: JSON.stringify({ action: "delete_project", input: { id } }),
  });
}

export function saveTodoTask(input: { id?: string; projectId: string; title: string; dueDate?: string | null; priority: TodoPriority }) {
  return todoApi<{ ok: true }>("/api/todo/action", {
    method: "POST",
    body: JSON.stringify({ action: "save_task", input }),
  });
}

export function toggleTodoTask(id: string, completed: boolean) {
  return todoApi<{ ok: true }>("/api/todo/action", {
    method: "POST",
    body: JSON.stringify({ action: "toggle_task", input: { id, completed } }),
  });
}

export function deleteTodoTask(id: string) {
  return todoApi<{ ok: true }>("/api/todo/action", {
    method: "POST",
    body: JSON.stringify({ action: "delete_task", input: { id } }),
  });
}
