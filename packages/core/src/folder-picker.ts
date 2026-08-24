/**
 * Host-agnostic folder-picker bridge.
 *
 * The CRON-styled folder browser (renderer) drives navigation through a small
 * injected `list`/`confirm` bridge, and the selected folder is returned to the
 * host adapter's `selectFolder()` via `settleFolderSelection`. This keeps the
 * reusable core free of Electron/window.host imports while letting the host
 * supply the actual filesystem listing.
 */

export interface FolderEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface FolderListing {
  /** Resolved absolute path of the directory that was listed. */
  path: string;
  /** Parent directory path, or null at a filesystem root. */
  parent: string | null;
  entries: FolderEntry[];
}

export interface FolderPickerBridge {
  /** Lists a directory; an empty string means "start here" (host home folder). */
  list(dir: string): Promise<FolderListing>;
  /** Validates the chosen directory and returns its resolved path (null = invalid). */
  confirm(dir: string): Promise<string | null>;
}

let pendingResolve: ((path: string | null) => void) | null = null;

/**
 * Returns a promise that resolves when the folder picker settles. The host
 * adapter's `selectFolder()` waits on this while the CRON modal is open.
 */
export function awaitFolderSelection(): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    pendingResolve = resolve;
  });
}

/** Settles the pending picker with the chosen folder (or null when cancelled). */
export function settleFolderSelection(path: string | null): void {
  const resolve = pendingResolve;
  pendingResolve = null;
  if (resolve) resolve(path);
}
