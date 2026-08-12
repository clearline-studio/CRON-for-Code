// Pure IPC registration bookkeeping for the CRON for Code Electron main process.
// This module has NO Electron imports so it can be unit-tested with vitest.
// The actual handler bodies live in main.mjs; this module only owns:
//   - the authoritative channel lists (ALL and the REQUIRED eight);
//   - the once-only registration pass with duplicate detection;
//   - required-channel verification and startup-failure surfacing.

export const ALL_IPC_CHANNELS = Object.freeze([
  'cron:select-folder',
  'cron:db:load-all',
  'cron:db:save-project',
  'cron:db:delete-project',
  'cron:db:save-task',
  'cron:db:delete-task',
  'cron:db:set-preference',
  'cron:db:get-preference',
  'cron:db:update-task-status',
  'cron:db:queue-task',
  'cron:db:resolve-approval',
  'cron:task:run-now',
  'cron:execution:cancel',
  'cron:execution:list-commands',
  'cron:opencode:run-task',
  'cron:db:save-execution',
  'cron:db:audit-append',
  'cron:db:audit-list',
  'cron:project:reveal',
  'cron:project:copy-path',
  'cron:project:refresh',
  'cron:project:rename',
  'cron:project:relink',
  'cron:project:unarchive',
  'cron:project:archive',
  'cron:project:restore-last-active',
  'cron:app:restart',
  'cron:diag:marker',
  'cron:diag:ready',
  'cron:diag:usable',
  'cron:lmstudio:get-config',
  'cron:lmstudio:save-config',
  'cron:lmstudio:test',
  'cron:lmstudio:chat',
]);

/** The eight project-management + lifecycle channels that must always be live. */
export const REQUIRED_IPC_CHANNELS = Object.freeze([
  'cron:app:restart',
  'cron:project:reveal',
  'cron:project:copy-path',
  'cron:project:refresh',
  'cron:project:rename',
  'cron:project:relink',
  'cron:project:archive',
  'cron:project:restore-last-active',
]);

/**
 * Creates an IPC registrar bound to an injected `handle(channel, handler)` function
 * (the caller wraps `ipcMain.handle`). Guarantees:
 *  - registration can start exactly once (`begin` throws on a second call);
 *  - each channel can be registered exactly once (`register` throws on duplicates);
 *  - `complete` verifies every REQUIRED channel is present and throws otherwise;
 *  - failures are recorded per channel and surfaced loudly (never silent).
 */
export function createIpcRegistrar({ handle }) {
  if (typeof handle !== 'function') {
    throw new Error('createIpcRegistrar requires a handle(channel, handler) function');
  }

  let state = 'idle'; // 'idle' | 'registering' | 'complete'
  const channels = new Set();
  const failures = [];

  return {
    get state() {
      return state;
    },
    get registeredChannels() {
      return [...channels].sort();
    },
    get registrationFailures() {
      return [...failures];
    },
    get missingRequiredChannels() {
      return REQUIRED_IPC_CHANNELS.filter((channel) => !channels.has(channel));
    },

    begin() {
      if (state !== 'idle') {
        throw new Error(
          `IPC registration already ${state === 'complete' ? 'completed' : 'started'}; registration is allowed exactly once`,
        );
      }
      state = 'registering';
    },

    register(channel, handler) {
      if (state !== 'registering') {
        throw new Error(
          'IPC handlers must be registered inside the single registration pass (begin → register* → complete)',
        );
      }
      if (typeof channel !== 'string' || channel.trim() === '') {
        throw new Error('IPC channel must be a non-empty string');
      }
      if (channels.has(channel)) {
        const error = new Error(`Duplicate IPC handler registration: ${channel}`);
        failures.push({ channel, error: error.message });
        throw error;
      }
      try {
        handle(channel, handler);
        channels.add(channel);
      } catch (err) {
        const wrapped = new Error(
          `Failed to register IPC handler '${channel}': ${err instanceof Error ? err.message : String(err)}`,
        );
        failures.push({ channel, error: wrapped.message });
        throw wrapped;
      }
      return channel;
    },

    complete() {
      if (state !== 'registering') {
        throw new Error('complete() may only be called once during the registration pass');
      }
      const missing = REQUIRED_IPC_CHANNELS.filter((channel) => !channels.has(channel));
      if (missing.length > 0) {
        const error = new Error(`Required IPC handlers not registered: ${missing.join(', ')}`);
        failures.push({ channel: '', error: error.message });
        throw error;
      }
      state = 'complete';
      return { channels: this.registeredChannels, failures: this.registrationFailures };
    },
  };
}
