import { describe, it, expect } from 'vitest';
import { createCodeProject, touchProject } from './project.js';

describe('createCodeProject', () => {
  it('creates with timestamps', () => {
    const project = createCodeProject('p1', 'My Project', '/home/projects/my-project');
    expect(project.id).toBe('p1');
    expect(project.name).toBe('My Project');
    expect(project.rootPath).toBe('/home/projects/my-project');
    expect(project.createdAt).toBeGreaterThan(0);
    expect(project.updatedAt).toBe(project.createdAt);
    expect(project.lastOpenedAt).toBeNull();
  });
});

describe('touchProject', () => {
  it('updates lastOpenedAt and updatedAt', () => {
    const project = createCodeProject('p1', 'P', '/');
    const touched = touchProject(project);
    expect(touched.lastOpenedAt).not.toBeNull();
    expect(touched.updatedAt).toBeGreaterThanOrEqual(project.updatedAt);
    expect(touched.lastOpenedAt).toBeGreaterThanOrEqual(project.createdAt);
  });
});
