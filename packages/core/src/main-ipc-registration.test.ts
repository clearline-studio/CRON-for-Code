import { describe, it, expect, vi } from 'vitest';
import type { IpcRegistrar } from '../../../apps/standalone/electron/register-ipc.mjs';
import { ALL_IPC_CHANNELS, REQUIRED_IPC_CHANNELS, createIpcRegistrar } from '../../../apps/standalone/electron/register-ipc.mjs';

describe('IPC channel lists', () => {
  it('defines exactly the eight required project/lifecycle channels', () => {
    expect([...REQUIRED_IPC_CHANNELS].sort()).toEqual(
      [
        'cron:app:restart',
        'cron:project:archive',
        'cron:project:copy-path',
        'cron:project:refresh',
        'cron:project:relink',
        'cron:project:rename',
        'cron:project:restore-last-active',
        'cron:project:reveal',
      ].sort(),
    );
  });

  it('ALL_IPC_CHANNELS is a superset of REQUIRED_IPC_CHANNELS', () => {
    for (const channel of REQUIRED_IPC_CHANNELS) {
      expect(ALL_IPC_CHANNELS).toContain(channel);
    }
  });

  it('contains no duplicates in the full channel list', () => {
    expect(new Set(ALL_IPC_CHANNELS).size).toBe(ALL_IPC_CHANNELS.length);
  });
});

describe('createIpcRegistrar', () => {
  function makeRegistrar(handle = vi.fn()) {
    const registrar = createIpcRegistrar({ handle });
    return { registrar, handle };
  }

  function completePass(registrar: IpcRegistrar, channels: readonly string[] = ALL_IPC_CHANNELS) {
    registrar.begin();
    for (const channel of channels) {
      registrar.register(channel, async () => undefined);
    }
    return registrar.complete();
  }

  it('registers all channels and returns the full list', () => {
    const { registrar, handle } = makeRegistrar();
    const summary = completePass(registrar);
    expect(handle).toHaveBeenCalledTimes(ALL_IPC_CHANNELS.length);
    expect(summary.channels).toHaveLength(ALL_IPC_CHANNELS.length);
    for (const channel of REQUIRED_IPC_CHANNELS) {
      expect(summary.channels).toContain(channel);
    }
    expect(summary.failures).toEqual([]);
  });

  it('registration is allowed exactly once (second begin throws)', () => {
    const { registrar } = makeRegistrar();
    completePass(registrar);
    expect(() => registrar.begin()).toThrow(/exactly once/);
  });

  it('duplicate registration is rejected safely', () => {
    const { registrar } = makeRegistrar();
    registrar.begin();
    registrar.register('cron:app:restart', async () => undefined);
    expect(() => registrar.register('cron:app:restart', async () => undefined)).toThrow(/Duplicate IPC handler registration/);
    expect(registrar.registrationFailures).toHaveLength(1);
  });

  it('startup failure surfaces when a handler cannot register (handle throws)', () => {
    const handle = vi.fn().mockImplementation((channel) => {
      if (channel === 'cron:app:restart') throw new Error('ipcMain refused');
    });
    const { registrar } = makeRegistrar(handle);
    registrar.begin();
    for (const channel of ALL_IPC_CHANNELS) {
      if (channel === 'cron:app:restart') {
        expect(() => registrar.register(channel, async () => undefined)).toThrow(/Failed to register IPC handler 'cron:app:restart'/);
      } else {
        registrar.register(channel, async () => undefined);
      }
    }
    expect(registrar.registrationFailures).toHaveLength(1);
    expect(registrar.registrationFailures[0].channel).toBe('cron:app:restart');
    expect(() => registrar.complete()).toThrow(/Required IPC handlers not registered: cron:app:restart/);
  });

  it('complete() fails loudly when a required channel is missing (no partial silent registration)', () => {
    const { registrar } = makeRegistrar();
    registrar.begin();
    const missing = ALL_IPC_CHANNELS.filter((c) => c !== 'cron:project:reveal');
    for (const channel of missing) {
      registrar.register(channel, async () => undefined);
    }
    expect(() => registrar.complete()).toThrow(/Required IPC handlers not registered: cron:project:reveal/);
    expect(registrar.missingRequiredChannels).toEqual(['cron:project:reveal']);
  });

  it('register outside the registration pass is rejected', () => {
    const { registrar } = makeRegistrar();
    expect(() => registrar.register('cron:select-folder', async () => undefined)).toThrow(/single registration pass/);
  });

  it('the dev marker required-channel list matches REQUIRED_IPC_CHANNELS', () => {
    const { registrar } = makeRegistrar();
    completePass(registrar);
    expect(registrar.registeredChannels).toEqual([...ALL_IPC_CHANNELS].sort());
  });

  it('complete() cannot run outside an in-progress registration pass', () => {
    const { registrar } = makeRegistrar();
    expect(() => registrar.complete()).toThrow(/complete\(\) may only be called once/);
    completePass(registrar);
    expect(() => registrar.complete()).toThrow(/complete\(\) may only be called once/);
  });
});
