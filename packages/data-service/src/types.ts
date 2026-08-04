import type { CodeProject, Task, TaskStatus, Approval } from '@cron-code/contracts';

export interface DataStore {
  projects: {
    list(): Promise<CodeProject[]>;
    get(id: string): Promise<CodeProject | null>;
    save(project: CodeProject): Promise<void>;
    delete(id: string): Promise<void>;
  };

  tasks: {
    list(projectId: string): Promise<Task[]>;
    get(id: string): Promise<Task | null>;
    save(task: Task): Promise<void>;
    delete(id: string): Promise<void>;
    listAll(): Promise<Task[]>;
    updateStatus(id: string, status: TaskStatus, error?: string): Promise<void>;
    queue(id: string): Promise<void>;
    runNow(id: string): Promise<void>;
  };

  approvals: {
    list(taskId: string): Promise<Approval[]>;
    get(id: string): Promise<Approval | null>;
    save(approval: Approval): Promise<void>;
    delete(id: string): Promise<void>;
    listAll(): Promise<Approval[]>;
    resolve(id: string, status: 'approved' | 'rejected', reason?: string): Promise<void>;
  };

  preferences: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
}

export interface DataServiceConfig {
  storagePath: string;
}

export interface DataService extends DataStore {
  readonly config: DataServiceConfig;
  initialize(): Promise<void>;
  flush(): Promise<void>;
  destroy(): Promise<void>;
}
