import { describe, it, expect } from 'vitest';
import {
  createCodeProject,
  touchProject,
  withAvailability,
  archiveCodeProject,
  restoreCodeProject,
  relinkCodeProject,
  renameCodeProject,
} from './project.js';

describe('createCodeProject', () => {
  it('creates with timestamps and default availability/archived state', () => {
    const project = createCodeProject('p1', 'My Project', '/home/projects/my-project');
    expect(project.id).toBe('p1');
    expect(project.name).toBe('My Project');
    expect(project.rootPath).toBe('/home/projects/my-project');
    expect(project.createdAt).toBeGreaterThan(0);
    expect(project.updatedAt).toBe(project.createdAt);
    expect(project.lastOpenedAt).toBeNull();
    expect(project.availability).toBe('available');
    expect(project.archived).toBe(false);
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

describe('withAvailability', () => {
  it('updates the availability without changing the id or rootPath', () => {
    const project = createCodeProject('p1', 'P', 'C:/repo');
    const updated = withAvailability(project, 'missing');
    expect(updated.availability).toBe('missing');
    expect(updated.id).toBe('p1');
    expect(updated.rootPath).toBe('C:/repo');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(project.updatedAt);
  });
});

describe('archive / restore', () => {
  it('archives (keeps history) and restores (clears archive + availability)', () => {
    const project = createCodeProject('p1', 'P', 'C:/repo');
    const archived = archiveCodeProject(project);
    expect(archived.archived).toBe(true);
    expect(archived.id).toBe('p1');
    expect(archived.rootPath).toBe('C:/repo');
    const missing = withAvailability(archived, 'missing');
    const restored = restoreCodeProject(missing);
    expect(restored.archived).toBe(false);
    expect(restored.availability).toBe('available');
    expect(restored.id).toBe('p1');
  });
});

describe('relinkCodeProject', () => {
  it('updates rootPath and clears missing state without changing the id', () => {
    const project = createCodeProject('p1', 'P', 'C:/old');
    const missing = withAvailability(project, 'missing');
    const relinked = relinkCodeProject(missing, 'C:/new');
    expect(relinked.id).toBe('p1');
    expect(relinked.rootPath).toBe('C:/new');
    expect(relinked.availability).toBe('available');
  });
});

describe('renameCodeProject', () => {
  it('updates name without changing the id, rootPath, or availability', () => {
    const project = createCodeProject('p1', 'Old', 'C:/repo');
    const renamed = renameCodeProject(project, 'New');
    expect(renamed.id).toBe('p1');
    expect(renamed.name).toBe('New');
    expect(renamed.rootPath).toBe('C:/repo');
  });
});
