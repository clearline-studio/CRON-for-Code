import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  createAuditRecord,
  createExecutionError,
} from '@cron-code/contracts';
import type { CodeProject, ProjectAvailability } from '@cron-code/contracts';
import type { DataService } from './types.js';
import { logger } from './logger.js';
import { normalizeProjectPath } from './path-normalize.js';

export interface ProjectManagementOutcome<T = CodeProject> {
  readonly project: T;
  /** True when this call resulted in a state change worth auditing. */
  readonly changed: boolean;
}

export interface ProjectManagementConflict {
  readonly conflictProjectId: string;
  readonly conflictRootPath: string;
}

const SYSTEM_ROOT_GUARDS = ['C:\\windows', 'c:/windows', 'C:\\program files', 'C:/program files'];

function isUncPath(p: string): boolean {
  return p.startsWith('\\\\') || p.startsWith('//');
}

function isDriveRoot(p: string): boolean {
  return p === path.parse(p).root;
}

function safeRootPath(rawPath: string): string {
  if (typeof rawPath !== 'string' || rawPath.trim() === '') {
    throw createExecutionError('INVALID_REQUEST', 'Project path is missing');
  }
  const absolute = path.resolve(rawPath);
  if (!/^[A-Za-z]:[\\/]/.test(absolute) && !absolute.startsWith('/')) {
    throw createExecutionError('PATH_REJECTED', 'Project path must be an absolute local path', absolute);
  }
  if (isUncPath(absolute)) {
    throw createExecutionError('PATH_REJECTED', 'UNC/network paths are not supported', absolute);
  }
  if (isDriveRoot(absolute)) {
    throw createExecutionError('PATH_REJECTED', 'Root-drive selection is not allowed', absolute);
  }
  if (!existsSync(absolute)) {
    throw createExecutionError('PATH_REJECTED', 'Project path does not exist', absolute);
  }
  let stat;
  try {
    stat = statSync(absolute);
  } catch {
    throw createExecutionError('PATH_REJECTED', 'Project path cannot be inspected', absolute);
  }
  if (!stat.isDirectory()) {
    throw createExecutionError('PATH_REJECTED', 'Project path is not a directory', absolute);
  }
  const lower = absolute.toLowerCase();
  for (const guard of SYSTEM_ROOT_GUARDS) {
    if (lower === guard.toLowerCase()) {
      throw createExecutionError('PATH_REJECTED', 'System folders cannot be selected', absolute);
    }
  }
  return absolute;
}

function inspectAvailability(rootPath: string): ProjectAvailability {
  try {
    if (!existsSync(rootPath)) return 'missing';
    const stat = statSync(rootPath);
    if (!stat.isDirectory()) return 'unavailable';
    return 'available';
  } catch {
    return 'unavailable';
  }
}

function auditId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Public, narrow, audited entry point for project-management operations.
 *  No filesystem deletes; archival hides navigation only. */
export class ProjectManagementService {
  constructor(private readonly dataService: DataService) {}

  /** Validates and stores a new rootPath. Returns the conflict when the new
   *  path belongs to another non-archived canonical project.
   *  Re-linking an archived project restores it (clears archived, keeps id/history). */
  async linkRootPath(
    projectId: string,
    newRootPath: string,
  ): Promise<{ project: CodeProject; conflict?: ProjectManagementConflict }> {
    const safe = safeRootPath(newRootPath);
    const project = await this.dataService.projects.get(projectId);
    if (!project) {
      throw createExecutionError('INVALID_REQUEST', 'Project not found', projectId);
    }
    const normalizedNew = normalizeProjectPath(safe);
    const others = await this.dataService.projects.list();
    for (const candidate of others) {
      if (candidate.id === projectId) continue;
      if (candidate.archived) continue;
      if (normalizeProjectPath(candidate.rootPath) === normalizedNew) {
        return {
          project,
          conflict: {
            conflictProjectId: candidate.id,
            conflictRootPath: candidate.rootPath,
          },
        };
      }
    }
    // Re-linking an archived project is an explicit restore: clear the archived
    // flag first (history and id are preserved) so the project becomes visible.
    if (project.archived) {
      await this.unarchiveIfArchived(projectId);
    }
    const next = await this.dataService.projects.setRootPath(projectId, safe);
    if (!next) {
      throw createExecutionError('INVALID_REQUEST', 'Project not found', projectId);
    }
    await this.recordAudit({
      eventType: 'project.relinked',
      projectId,
    });
    return { project: next };
  }

  /** Archives a project (no filesystem side effects). Idempotent. */
  async archiveProject(
    projectId: string,
  ): Promise<{ project: CodeProject | null; changed: boolean }> {
    const project = await this.dataService.projects.get(projectId);
    if (!project) return { project: null, changed: false };
    if (project.archived) return { project, changed: false };
    const next = await this.dataService.projects.archive(projectId);
    if (!next) return { project: null, changed: false };
    await this.recordAudit({
      eventType: 'project.archived',
      projectId,
    });
    return { project: next, changed: true };
  }

  /** Restores an archived project (used by re-link/select of the same canonical path). */
  async unarchiveIfArchived(
    projectId: string,
  ): Promise<{ project: CodeProject | null; changed: boolean }> {
    const project = await this.dataService.projects.get(projectId);
    if (!project) return { project: null, changed: false };
    if (!project.archived) return { project, changed: false };
    const next = await this.dataService.projects.unarchive(projectId);
    if (!next) return { project: null, changed: false };
    await this.recordAudit({
      eventType: 'project.restored',
      projectId,
    });
    return { project: next, changed: true };
  }

  /** Renames the CRON display name only. Folder name is never touched. */
  async renameProject(
    projectId: string,
    name: string,
  ): Promise<{ project: CodeProject; changed: boolean }> {
    const project = await this.dataService.projects.get(projectId);
    if (!project) {
      throw createExecutionError('INVALID_REQUEST', 'Project not found', projectId);
    }
    if (project.name === name) return { project, changed: false };
    const next = await this.dataService.projects.setName(projectId, name);
    if (!next) {
      throw createExecutionError('INVALID_REQUEST', 'Project not found', projectId);
    }
    await this.recordAudit({
      eventType: 'project.renamed',
      projectId,
    });
    return { project: next, changed: true };
  }

  /** Refreshes filesystem availability state for one project. */
  async refreshAvailability(
    projectId: string,
  ): Promise<{ project: CodeProject; availability: ProjectAvailability }> {
    const project = await this.dataService.projects.get(projectId);
    if (!project) {
      throw createExecutionError('INVALID_REQUEST', 'Project not found', projectId);
    }
    const availability = inspectAvailability(project.rootPath);
    const next = await this.dataService.projects.setAvailability(projectId, availability);
    if (!next) {
      throw createExecutionError('INVALID_REQUEST', 'Project not found', projectId);
    }
    await this.recordAudit({
      eventType: 'project.refreshed',
      projectId,
    });
    return { project: next, availability };
  }

  /** Refreshes availability for every non-archived project. */
  async refreshAll(): Promise<Array<{ project: CodeProject; availability: ProjectAvailability }>> {
    const all = await this.dataService.projects.list();
    const results: Array<{ project: CodeProject; availability: ProjectAvailability }> = [];
    for (const project of all) {
      if (project.archived) continue;
      const availability = inspectAvailability(project.rootPath);
      if (project.availability !== availability) {
        const next = await this.dataService.projects.setAvailability(project.id, availability);
        if (next) {
          await this.recordAudit({ eventType: 'project.refreshed', projectId: project.id });
          results.push({ project: next, availability });
        }
      } else {
        results.push({ project, availability });
      }
    }
    return results;
  }

  /** Persists the last-active project id (used on selection + on startup restore). */
  async rememberLastActive(projectId: string | null): Promise<void> {
    await this.dataService.preferences.set('lastActiveProjectId', projectId ?? '');
  }

  async readLastActive(): Promise<string | null> {
    const value = await this.dataService.preferences.get('lastActiveProjectId');
    if (typeof value !== 'string' || value.trim() === '') return null;
    return value;
  }

  /** Records a narrow, project-management audit event. */
  async recordAudit(input: {
    eventType:
      | 'project.archived'
      | 'project.restored'
      | 'project.renamed'
      | 'project.relinked'
      | 'project.refreshed'
      | 'app.restart_requested';
    projectId?: string | null;
  }): Promise<void> {
    try {
      await this.dataService.audit.append(
        createAuditRecord({
          id: auditId('audit'),
          eventType: input.eventType,
          projectId: input.projectId ?? null,
        }),
      );
    } catch (err) {
      logger.warn('Audit append failed', { error: String(err), eventType: input.eventType });
    }
  }
}
