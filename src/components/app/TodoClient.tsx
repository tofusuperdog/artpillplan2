"use client";

import { ArrowLeft, CalendarDays, Check, FolderPlus, ListTodo, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  deleteTodoProject,
  deleteTodoTask,
  loadTodoData,
  saveTodoProject,
  saveTodoTask,
  toggleTodoTask,
} from "@/lib/todoData";
import type { TodoData, TodoPriority, TodoProject, TodoProjectColor, TodoTask } from "@/lib/todoTypes";

const EMPTY_DATA: TodoData = { projects: [], tasks: [] };
const projectColors: TodoProjectColor[] = ["amber", "red", "green", "blue", "purple"];
const priorities: TodoPriority[] = ["low", "medium", "high"];

export default function TodoClient() {
  const router = useRouter();
  const [data, setData] = useState<TodoData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("all");
  const [taskEditor, setTaskEditor] = useState<TodoTask | "new" | null>(null);
  const [projectEditorOpen, setProjectEditorOpen] = useState(false);
  const [workingTaskId, setWorkingTaskId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setData(await loadTodoData());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load tasks.";
      if (message === "Unauthorized") {
        router.replace("/");
        router.refresh();
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const visibleTasks = useMemo(() => {
    const tasks = selectedProject === "all" ? data.tasks : data.tasks.filter((task) => task.project_id === selectedProject);
    return [...tasks].sort((left, right) => {
      if (left.is_completed !== right.is_completed) return Number(left.is_completed) - Number(right.is_completed);
      if (!left.due_date) return 1;
      if (!right.due_date) return -1;
      return left.due_date.localeCompare(right.due_date);
    });
  }, [data.tasks, selectedProject]);

  const today = dateInputToday();
  const openCount = data.tasks.filter((task) => !task.is_completed).length;
  const dueTodayCount = data.tasks.filter((task) => !task.is_completed && task.due_date === today).length;

  const toggle = async (task: TodoTask) => {
    setWorkingTaskId(task.id);
    try {
      await toggleTodoTask(task.id, !task.is_completed);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task.");
    } finally {
      setWorkingTaskId(null);
    }
  };

  return (
    <main className="launcher-page-shell todo-page-shell">
      <div className="launcher-app todo-app">
        <header className="top-header todo-header">
          <button className="icon-btn" onClick={() => router.push("/home")} aria-label="Back"><ArrowLeft /></button>
          <div className="wordmark">To do</div>
        </header>

        <section className="todo-overview">
          <div>
            <span>{openCount}</span>
            <small>Open tasks</small>
          </div>
          <div>
            <span>{dueTodayCount}</span>
            <small>Due today</small>
          </div>
          <button className="primary" onClick={() => setTaskEditor("new")} disabled={data.projects.length === 0}><Plus /> New task</button>
        </section>

        <div className="todo-project-bar">
          <div className="todo-project-tabs" aria-label="Projects">
            <button className={selectedProject === "all" ? "active" : ""} onClick={() => setSelectedProject("all")}>All</button>
            {data.projects.map((project) => (
              <button key={project.id} className={selectedProject === project.id ? "active" : ""} onClick={() => setSelectedProject(project.id)}>
                <i className={`todo-project-dot ${project.color}`} />{project.name}
              </button>
            ))}
          </div>
          <button className="todo-manage-projects" onClick={() => setProjectEditorOpen(true)} aria-label="Manage projects"><FolderPlus /></button>
        </div>

        {loading && <section className="retro-panel todo-empty"><ListTodo /><p>Loading tasks...</p></section>}
        {error && <section className="retro-panel todo-empty"><p>{error}</p><button className="secondary" onClick={refresh}>Retry</button></section>}
        {!loading && !error && visibleTasks.length === 0 && (
          <section className="retro-panel todo-empty"><ListTodo /><h2>Nothing here yet</h2><p>Create a task and keep the day moving.</p></section>
        )}

        {!loading && !error && visibleTasks.length > 0 && (
          <section className="todo-task-list" aria-label="Tasks">
            {visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                project={data.projects.find((project) => project.id === task.project_id)}
                working={workingTaskId === task.id}
                onToggle={() => toggle(task)}
                onEdit={() => setTaskEditor(task)}
              />
            ))}
          </section>
        )}

        {taskEditor && (
          <TaskEditor
            task={taskEditor === "new" ? null : taskEditor}
            projects={data.projects}
            selectedProject={selectedProject}
            onClose={() => setTaskEditor(null)}
            onSaved={async () => { await refresh(); setTaskEditor(null); }}
          />
        )}

        {projectEditorOpen && (
          <ProjectEditor
            projects={data.projects}
            onClose={() => setProjectEditorOpen(false)}
            onChanged={async () => {
              await refresh();
              setSelectedProject("all");
            }}
          />
        )}
      </div>
    </main>
  );
}

function TaskRow({ task, project, working, onToggle, onEdit }: {
  task: TodoTask;
  project?: TodoProject;
  working: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const overdue = Boolean(task.due_date && task.due_date < dateInputToday() && !task.is_completed);
  return <article className={`todo-task-row ${task.is_completed ? "completed" : ""}`}>
    <button className="todo-check" onClick={onToggle} disabled={working} aria-label={task.is_completed ? "Mark incomplete" : "Mark complete"}>
      {task.is_completed && <Check />}
    </button>
    <button className="todo-task-content" onClick={onEdit}>
      <strong>{task.title}</strong>
      <span>
        {project && <em><i className={`todo-project-dot ${project.color}`} />{project.name}</em>}
        {task.due_date && <time className={overdue ? "overdue" : ""}><CalendarDays />{formatDeadline(task.due_date)}</time>}
        <b className={`todo-priority ${task.priority}`}>{task.priority}</b>
      </span>
    </button>
    <button className="todo-edit" onClick={onEdit} aria-label={`Edit ${task.title}`}><Pencil /></button>
  </article>;
}

function TaskEditor({ task, projects, selectedProject, onClose, onSaved }: {
  task: TodoTask | null;
  projects: TodoProject[];
  selectedProject: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const defaultProject = task?.project_id || (selectedProject !== "all" ? selectedProject : projects[0]?.id || "");
  const [projectId, setProjectId] = useState(defaultProject);
  const [title, setTitle] = useState(task?.title || "");
  const [dueDate, setDueDate] = useState(task?.due_date || "");
  const [priority, setPriority] = useState<TodoPriority>(task?.priority || "medium");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) return setMessage("Please enter a task name.");
    if (!projectId) return setMessage("Please select a project.");
    setWorking(true);
    setMessage(null);
    try {
      await saveTodoTask({ id: task?.id, projectId, title, dueDate: dueDate || null, priority });
      await onSaved();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save task.");
    } finally {
      setWorking(false);
    }
  };

  const remove = async () => {
    if (!task || !window.confirm("Delete this task?")) return;
    setWorking(true);
    try {
      await deleteTodoTask(task.id);
      await onSaved();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to delete task.");
      setWorking(false);
    }
  };

  return <div className="todo-modal-backdrop" role="dialog" aria-modal="true" aria-label={task ? "Edit task" : "New task"}>
    <section className="todo-modal">
      <div className="todo-modal-title"><h1>{task ? "Edit task" : "New task"}</h1><button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button></div>
      <label><span>Task</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to be done?" autoFocus /></label>
      <label><span>Project</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <label><span>Deadline</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
      <fieldset className="todo-priority-picker"><legend>Priority</legend>{priorities.map((value) => <button key={value} className={priority === value ? `active ${value}` : value} onClick={() => setPriority(value)}>{value}</button>)}</fieldset>
      {message && <p className="todo-form-message">{message}</p>}
      <div className="todo-modal-actions">
        {task && <button className="secondary danger-text" disabled={working} onClick={remove}><Trash2 /> Delete</button>}
        <button className="primary" disabled={working} onClick={save}>{working ? "Saving..." : "Save task"}</button>
      </div>
    </section>
  </div>;
}

function ProjectEditor({ projects, onClose, onChanged }: { projects: TodoProject[]; onClose: () => void; onChanged: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<TodoProjectColor>("amber");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const add = async () => {
    if (!name.trim()) return setMessage("Please enter a project name.");
    setWorking(true);
    setMessage(null);
    try {
      await saveTodoProject({ name, color });
      setName("");
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to create project.");
    } finally {
      setWorking(false);
    }
  };

  const remove = async (project: TodoProject) => {
    if (!window.confirm(`Delete “${project.name}” and all of its tasks?`)) return;
    setWorking(true);
    try {
      await deleteTodoProject(project.id);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to delete project.");
    } finally {
      setWorking(false);
    }
  };

  return <div className="todo-modal-backdrop" role="dialog" aria-modal="true" aria-label="Projects">
    <section className="todo-modal todo-project-modal">
      <div className="todo-modal-title"><h1>Projects</h1><button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button></div>
      <div className="todo-project-create">
        <label><span>New project</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" /></label>
        <div className="todo-color-picker" aria-label="Project color">{projectColors.map((value) => <button key={value} className={`${value} ${color === value ? "active" : ""}`} onClick={() => setColor(value)} aria-label={value} />)}</div>
        <button className="primary" disabled={working} onClick={add}><Plus /> Add project</button>
      </div>
      <div className="todo-project-manage-list">{projects.map((project) => <div key={project.id}><span><i className={`todo-project-dot ${project.color}`} />{project.name}</span><button onClick={() => remove(project)} disabled={working} aria-label={`Delete ${project.name}`}><Trash2 /></button></div>)}</div>
      {message && <p className="todo-form-message">{message}</p>}
    </section>
  </div>;
}

function dateInputToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatDeadline(value: string) {
  if (value === dateInputToday()) return "Today";
  return new Date(`${value}T00:00:00+07:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Bangkok" });
}
