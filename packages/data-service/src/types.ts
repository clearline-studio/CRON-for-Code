import type {
  CodeProject,
  ProjectAvailability,
  Task,
  TaskStatus,
  Approval,
  ExecutionRecord,
  AuditRecord,
} from '@cron-code/contracts';

export interface DataStore {
  projects: {
    list(): Promise<CodeProject[]>;
    get(id: string): Promise<CodeProject | null>;
    save(project: CodeProject): Promise<void>;
    delete(id: string): Promise<void>;
    /** Marks a project as archived (hidden from active navigation, history preserved). */
    archive(id: string): Promise<CodeProject | null>;
    /** Clears the archived flag (used by re-link/relink restore). */
    unarchive(id: string): Promise<CodeProject | null>;
    /** Sets the project rootPath (re-link) and clears missing state. */
    setRootPath(id: string, rootPath: string): Promise<CodeProject | null>;
    /** Sets the project name (display rename). */
    setName(id: string, name: string): Promise<CodeProject | null>;
    /** Sets the project availability state. */
    setAvailability(id: string, availability: ProjectAvailability): Promise<CodeProject | null>;
  };

  tasks: {
    list(projectId: string): Promise<Task[]>;
    get(id: string): Promise<Task | null>;
    save(task: Task): Promise<void>;
    delete(id: string): Promise<void>;
    listAll(): Promise<Task[]>;
    updateStatus(id: string, status: TaskStatus, error?: string): Promise<void>;
    queue(id: string): Promise<void>;
    runNow(id: string, commandId?: string): Promise<void>;
  };

  approvals: {
    list(taskId: string): Promise<Approval[]>;
    get(id: string): Promise<Approval | null>;
    save(approval: Approval): Promise<void>;
    delete(id: string): Promise<void>;
    listAll(): Promise<Approval[]>;
    resolve(id: string, status: 'approved' | 'rejected', reason?: string): Promise<void>;
  };

  executions: {
    list(projectId: string): Promise<ExecutionRecord[]>;
    listAll(): Promise<ExecutionRecord[]>;
    get(id: string): Promise<ExecutionRecord | null>;
    save(record: ExecutionRecord): Promise<void>;
    cancel(id: string): Promise<void>;
  };

  audit: {
    append(record: AuditRecord): Promise<void>;
    list(filter?: { taskId?: string; projectId?: string; executionId?: string }): Promise<AuditRecord[]>;
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

export interface CommandSummary {
  id: string;
  displayCommand: string;
  category: string;
  risk: string;
  readOnly: boolean;
  requiresApproval: boolean;
  timeoutMs: number;
}

export interface DataService extends DataStore {
  readonly config: DataServiceConfig;
  initialize(): Promise<void>;
  flush(): Promise<void>;
  destroy(): Promise<void>;
  /** Lists the safe command catalogue as a summary (for UI selectors). */
  listCommands(): Promise<CommandSummary[]>;
}
