import { describe, it, expect, vi } from 'vitest';
import { buildTrayMenuTemplate } from '../../../apps/standalone/electron/tray-template.mjs';

describe('tray context menu template', () => {
  it('contains the expected CRON items in order (native menus are OS-styled, so labels/order are the CRON treatment)', () => {
    const actions = {
      openApp: vi.fn(),
      showTasks: vi.fn(),
      pauseTask: vi.fn(),
      stopTask: vi.fn(),
      quit: vi.fn(),
    };
    const template = buildTrayMenuTemplate(actions);
    expect(template.map((item) => ('label' in item ? item.label : item.type))).toEqual([
      'Open CRON for Code',
      'separator',
      'Show active tasks',
      'Pause current task',
      'Stop current task',
      'separator',
      'Quit CRON for Code',
    ]);
  });

  it('wires each item to the expected action', () => {
    const actions = {
      openApp: vi.fn(),
      showTasks: vi.fn(),
      pauseTask: vi.fn(),
      stopTask: vi.fn(),
      quit: vi.fn(),
    };
    const template = buildTrayMenuTemplate(actions);
    const clickable = template.filter((item) => 'click' in item);
    expect(clickable).toHaveLength(5);
    for (const item of clickable) {
      if ('click' in item) item.click();
    }
    expect(actions.openApp).toHaveBeenCalledTimes(1);
    expect(actions.showTasks).toHaveBeenCalledTimes(1);
    expect(actions.pauseTask).toHaveBeenCalledTimes(1);
    expect(actions.stopTask).toHaveBeenCalledTimes(1);
    expect(actions.quit).toHaveBeenCalledTimes(1);
  });
});
