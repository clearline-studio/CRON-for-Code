const { contextBridge, ipcRenderer } = require('electron');

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
    setPreference: (key, value) => ipcRenderer.invoke('cron:db:set-preference', key, value),
    getPreference: (key) => ipcRenderer.invoke('cron:db:get-preference', key),
  },

  task: {
    runNow: (taskId) => ipcRenderer.invoke('cron:task:run-now', taskId),
  },
});
