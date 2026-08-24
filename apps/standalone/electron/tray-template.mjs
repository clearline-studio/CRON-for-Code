// Pure tray context-menu template for the Electron main process.
// Deliberately has NO Electron imports so the item contract can be unit-tested
// (the standalone app has no vitest; core tests import this file directly).
// Windows native tray menus cannot be CSS-styled (they are OS-rendered), so the
// CRON treatment is: correct, clearly-labelled items in a stable order.

/**
 * @param {object} actions callbacks wired in the main process
 * @returns {Array<{label?: string, type?: 'separator', click?: Function}>}
 */
export function buildTrayMenuTemplate(actions) {
  return [
    {
      label: 'Open CRON for Code',
      click: actions.openApp,
    },
    { type: 'separator' },
    {
      label: 'Show active tasks',
      click: actions.showTasks,
    },
    {
      label: 'Pause current task',
      click: actions.pauseTask,
    },
    {
      label: 'Stop current task',
      click: actions.stopTask,
    },
    { type: 'separator' },
    {
      label: 'Quit CRON for Code',
      click: actions.quit,
    },
  ];
}
