/**
 * Host tray-event bridge. The Electron main process owns the tray menu and
 * emits `cron:tray:*` events into the renderer; this interface keeps the
 * reusable core host-agnostic (no Electron imports). Every subscription
 * returns an unsubscribe function for cleanup.
 */
export interface TrayClient {
  onShowTasks(callback: () => void): () => void;
  onPauseTask(callback: () => void): () => void;
  onStopTask(callback: () => void): () => void;
}
