export type TaskStatus = 'draft' | 'queued' | 'approval_required' | 'running' | 'completed' | 'failed' | 'blocked' | 'cancelled';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
}

export function createTask(
  id: string,
  projectId: string,
  title: string,
  prompt: string,
): Task {
  const now = Date.now();
  return {
    id,
    projectId,
    title,
    prompt,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    error: null,
  };
}

export function updateTaskStatus(task: Task, status: TaskStatus, error?: string): Task {
  const now = Date.now();
  const patch: Partial<Task> = { status, updatedAt: now };

  if (status === 'running' && task.startedAt === null) {
    patch.startedAt = now;
  }
  if (status === 'completed' || status === 'failed' || status === 'blocked' || status === 'cancelled') {
    patch.completedAt = now;
  }
  if (error !== undefined) {
    patch.error = error || null;
  }

  return { ...task, ...patch };
}
