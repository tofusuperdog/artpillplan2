export type TodoPriority = "low" | "medium" | "high";
export type TodoProjectColor = "amber" | "red" | "green" | "blue" | "purple";

export interface TodoProject {
  id: string;
  name: string;
  color: TodoProjectColor;
  created_at: string;
  updated_at: string;
}

export interface TodoTask {
  id: string;
  project_id: string;
  title: string;
  due_date: string | null;
  priority: TodoPriority;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TodoData {
  projects: TodoProject[];
  tasks: TodoTask[];
}
