export type {
  HostAdapter,
  HostEventListener,
  HostEventType,
  HostProjectSelection,
  HostProjectAction,
  HostProjectActionResult,
} from './types.js';

export { createStandaloneHostAdapter } from './standalone.js';
export type { StandaloneHostDeps, StandaloneHostActionBridge } from './standalone.js';

export { createMockHostAdapter } from './mock.js';
