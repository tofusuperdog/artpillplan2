"use client";

import { ArrowLeft, CalendarDays, Check, FolderPlus, ListTodo, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  deleteCompletedTodoTasks,
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
  const [clearingCompleted, setClearingCompleted] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

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
  const overdueCount = data.tasks.filter((task) => !task.is_completed && Boolean(task.due_date && task.due_date < today)).length;
  const completedCount = data.tasks.filter((task) => task.is_completed).length;

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

  const clearCompleted = async () => {
    if (completedCount === 0) return;
    setClearingCompleted(true);
    setClearError(null);
    try {
      await deleteCompletedTodoTasks();
      await refresh();
      setClearConfirmOpen(false);
    } catch (err) {
      setClearError(err instanceof Error ? err.message : "Unable to delete completed tasks.");
    } finally {
      setClearingCompleted(false);
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
          <div className={overdueCount > 0 ? "todo-overdue-stat" : ""}>
            <span>{overdueCount}</span>
            <small>Overdue</small>
          </div>
          <div className="todo-overview-actions">
            <button className="primary" onClick={() => setTaskEditor("new")} disabled={data.projects.length === 0}><Plus /> New task</button>
            <button className="secondary todo-clear-completed" onClick={() => { setClearError(null); setClearConfirmOpen(true); }} disabled={completedCount === 0 || clearingCompleted}>
              <Trash2 /> Clear completed ({completedCount})
            </button>
          </div>
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

        {clearConfirmOpen && (
          <ClearCompletedConfirm
            count={completedCount}
            working={clearingCompleted}
            message={clearError}
            onCancel={() => { setClearConfirmOpen(false); setClearError(null); }}
            onConfirm={clearCompleted}
          />
        )}
      </div>
    </main>
  );
}

function ClearCompletedConfirm({ count, working, message, onCancel, onConfirm }: {
  count: number;
  working: boolean;
  message: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return <div className="todo-modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="clear-completed-title" aria-describedby="clear-completed-description">
    <section className="todo-modal todo-confirm-modal">
      <div className="todo-confirm-icon" aria-hidden="true"><Trash2 /></div>
      <h1 id="clear-completed-title">Clear completed tasks?</h1>
      <p id="clear-completed-description">This will permanently delete {count} completed task{count === 1 ? "" : "s"}. This action cannot be undone.</p>
      {message && <p className="todo-form-message">{message}</p>}
      <div className="todo-confirm-actions">
        <button className="secondary" disabled={working} onClick={onCancel}>Cancel</button>
        <button className="danger-action" disabled={working || count === 0} onClick={onConfirm}><Trash2 /> {working ? "Deleting..." : "Delete tasks"}</button>
      </div>
    </section>
  </div>;
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
  const [editingProject, setEditingProject] = useState<TodoProject | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) return setMessage("Please enter a project name.");
    setWorking(true);
    setMessage(null);
    try {
      await saveTodoProject({ id: editingProject?.id, name, color });
      setName("");
      setColor("amber");
      setEditingProject(null);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to create project.");
    } finally {
      setWorking(false);
    }
  };

  const edit = (project: TodoProject) => {
    setEditingProject(project);
    setName(project.name);
    setColor(project.color);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingProject(null);
    setName("");
    setColor("amber");
    setMessage(null);
  };

  const remove = async (project: TodoProject) => {
    if (!window.confirm(`Delete “${project.name}” and all of its tasks?`)) return;
    setWorking(true);
    try {
      await deleteTodoProject(project.id);
      if (editingProject?.id === project.id) cancelEdit();
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
        <label><span>{editingProject ? "Edit project" : "New project"}</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" /></label>
        <div className="todo-color-picker" aria-label="Project color">{projectColors.map((value) => <button key={value} className={`${value} ${color === value ? "active" : ""}`} onClick={() => setColor(value)} aria-label={value} />)}</div>
        <div className="todo-project-form-actions">
          {editingProject && <button className="secondary" disabled={working} onClick={cancelEdit}>Cancel</button>}
          <button className="primary" disabled={working} onClick={save}>{editingProject ? <><Check /> Save changes</> : <><Plus /> Add project</>}</button>
        </div>
      </div>
      <div className="todo-project-manage-list">{projects.map((project) => <div key={project.id}><span><i className={`todo-project-dot ${project.color}`} />{project.name}</span><div className="todo-project-row-actions"><button onClick={() => edit(project)} disabled={working} aria-label={`Edit ${project.name}`}><Pencil /></button><button onClick={() => remove(project)} disabled={working} aria-label={`Delete ${project.name}`}><Trash2 /></button></div></div>)}</div>
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
