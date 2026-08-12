export type ProjectAvailability = 'available' | 'missing' | 'unavailable';

export interface CodeProject {
  id: string;
  name: string;
  rootPath: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
  /** Filesystem availability of the stored root path. Defaults to 'available' for legacy rows. */
  availability: ProjectAvailability;
  /** When true, the project is hidden from the active sidebar and excluded from restore. */
  archived: boolean;
}

export type CodeProjectSummary = Pick<
  CodeProject,
  'id' | 'name' | 'rootPath' | 'lastOpenedAt' | 'availability' | 'archived'
>;

export function createCodeProject(
  id: string,
  name: string,
  rootPath: string,
): CodeProject {
  const now = Date.now();
  return {
    id,
    name,
    rootPath,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    availability: 'available',
    archived: false,
  };
}

export function touchProject(project: CodeProject): CodeProject {
  return {
    ...project,
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
  };
}

export function withAvailability(
  project: CodeProject,
  availability: ProjectAvailability,
): CodeProject {
  return { ...project, availability, updatedAt: Date.now() };
}

export function archiveCodeProject(project: CodeProject): CodeProject {
  return { ...project, archived: true, updatedAt: Date.now() };
}

export function restoreCodeProject(project: CodeProject): CodeProject {
  return {
    ...project,
    archived: false,
    availability: 'available',
    updatedAt: Date.now(),
  };
}

export function relinkCodeProject(project: CodeProject, rootPath: string): CodeProject {
  return {
    ...project,
    rootPath,
    availability: 'available',
    updatedAt: Date.now(),
  };
}

export function renameCodeProject(project: CodeProject, name: string): CodeProject {
  return { ...project, name, updatedAt: Date.now() };
}
