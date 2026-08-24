export interface TrayMenuActionCallbacks {
  openApp: () => void;
  showTasks: () => void;
  pauseTask: () => void;
  stopTask: () => void;
  quit: () => void;
}

export type TrayMenuItem =
  | { label: string; click: () => void }
  | { type: 'separator' };

export declare function buildTrayMenuTemplate(
  actions: TrayMenuActionCallbacks,
): TrayMenuItem[];
