export type IpcHandleFn = (channel: string, handler: (...args: never[]) => unknown) => void;

export interface IpcRegistrationFailure {
  channel: string;
  error: string;
}

export interface IpcRegistrationSummary {
  channels: string[];
  failures: IpcRegistrationFailure[];
}

export interface IpcRegistrar {
  readonly state: 'idle' | 'registering' | 'complete';
  readonly registeredChannels: string[];
  readonly registrationFailures: IpcRegistrationFailure[];
  readonly missingRequiredChannels: string[];
  begin(): void;
  register(channel: string, handler: (...args: never[]) => unknown): string;
  complete(): IpcRegistrationSummary;
}

export declare const ALL_IPC_CHANNELS: readonly string[];
export declare const REQUIRED_IPC_CHANNELS: readonly string[];
export declare function createIpcRegistrar(options: {
  handle: IpcHandleFn;
}): IpcRegistrar;
