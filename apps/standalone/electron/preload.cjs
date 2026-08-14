const { contextBridge, ipcRenderer } = require('electron');

// Tray menu events flow main -> renderer. Each subscription returns an
// unsubscribe function so the renderer can clean up on unmount.
function subscribeToTrayEvent(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('cronHost', {
  selectFolder: () => ipcRenderer.invoke('cron:select-folder'),

  db: {
    loadAll: () => ipcRenderer.invoke('cron:db:load-all'),
    saveProject: (project) => ipcRenderer.invoke('cron:db:save-project', project),
    deleteProject: (id) => ipcRenderer.invoke('cron:db:delete-project', id),
    saveTask: (task) => ipcRenderer.invoke('cron:db:save-task', task),
    deleteTask: (id) => ipcRenderer.invoke('cron:db:delete-task', id),
    updateTaskStatus: (id, status, error) => ipcRenderer.invoke('cron:db:update-task-status', id, status, error),
    queueTask: (id) => ipcRenderer.invoke('cron:db:queue-task', id),
    saveApproval: (approval) => ipcRenderer.invoke('cron:db:save-approval', approval),
    deleteApproval: (id) => ipcRenderer.invoke('cron:db:delete-approval', id),
    resolveApproval: (id, status, reason) => ipcRenderer.invoke('cron:db:resolve-approval', id, status, reason),
    saveExecution: (record) => ipcRenderer.invoke('cron:db:save-execution', record),
    auditAppend: (record) => ipcRenderer.invoke('cron:db:audit-append', record),
    auditList: (filter) => ipcRenderer.invoke('cron:db:audit-list', filter),
    setPreference: (key, value) => ipcRenderer.invoke('cron:db:set-preference', key, value),
    getPreference: (key) => ipcRenderer.invoke('cron:db:get-preference', key),
  },

  task: {
    runNow: (taskId, commandId) => ipcRenderer.invoke('cron:task:run-now', taskId, commandId),
  },

  execution: {
    cancel: (executionId) => ipcRenderer.invoke('cron:execution:cancel', executionId),
    listCommands: () => ipcRenderer.invoke('cron:execution:list-commands'),
  },

  opencode: {
    runTask: (input) => ipcRenderer.invoke('cron:opencode:run-task', input),
    replyToApproval: (input) => ipcRenderer.invoke('cron:opencode:reply-approval', input),
    onEvent: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('cron:opencode:event', listener);
      return () => ipcRenderer.removeListener('cron:opencode:event', listener);
    },
  },

  project: {
    reveal: (projectId) => ipcRenderer.invoke('cron:project:reveal', projectId),
    copyPath: (projectId) => ipcRenderer.invoke('cron:project:copy-path', projectId),
    refresh: (projectId) => ipcRenderer.invoke('cron:project:refresh', projectId),
    rename: (projectId, name) => ipcRenderer.invoke('cron:project:rename', projectId, name),
    archive: (projectId) => ipcRenderer.invoke('cron:project:archive', projectId),
    unarchive: (projectId) => ipcRenderer.invoke('cron:project:unarchive', projectId),
    relink: (projectId) => ipcRenderer.invoke('cron:project:relink', projectId),
    restoreLastActive: () => ipcRenderer.invoke('cron:project:restore-last-active'),
  },

  app: {
    restart: () => ipcRenderer.invoke('cron:app:restart'),
  },

  tray: {
    onShowTasks: (callback) => subscribeToTrayEvent('cron:tray:show-tasks', callback),
    onPauseTask: (callback) => subscribeToTrayEvent('cron:tray:pause-task', callback),
    onStopTask: (callback) => subscribeToTrayEvent('cron:tray:stop-task', callback),
  },

  diag: {
    marker: () => ipcRenderer.invoke('cron:diag:marker'),
    ready: () => ipcRenderer.invoke('cron:diag:ready'),
    usable: () => ipcRenderer.invoke('cron:diag:usable'),
  },

  lmStudio: {
    getConfig: () => ipcRenderer.invoke('cron:lmstudio:get-config'),
    saveConfig: (config) => ipcRenderer.invoke('cron:lmstudio:save-config', config),
    test: (config) => ipcRenderer.invoke('cron:lmstudio:test', config),
    chat: (input) => ipcRenderer.invoke('cron:lmstudio:chat', input),
  },
});
