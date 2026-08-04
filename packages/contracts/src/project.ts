export interface CodeProject {
  id: string;
  name: string;
  rootPath: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
}

export type CodeProjectSummary = Pick<
  CodeProject,
  'id' | 'name' | 'rootPath' | 'lastOpenedAt'
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
  };
}

export function touchProject(project: CodeProject): CodeProject {
  return {
    ...project,
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
  };
}
