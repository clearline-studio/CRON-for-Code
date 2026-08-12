/** Normalises a project root path so equal folders compare equal (case-insensitive). */
export function normalizeProjectPath(rootPath: string): string {
  return rootPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}
