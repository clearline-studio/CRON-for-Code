export interface HostCapabilities {
  readonly canSelectProject: boolean;
  readonly canNavigate: boolean;
  readonly supportsTheming: boolean;
  readonly supportsMultiProject: boolean;
}

export interface HostContext {
  readonly hostId: string;
  readonly hostName: string;
  readonly activeProjectId: string | null;
  readonly theme: 'light' | 'dark';
  readonly capabilities: HostCapabilities;
  readonly contextualRefs: Record<string, string>;
}

export function createHostContext(
  hostId: string,
  hostName: string,
  options: {
    theme?: 'light' | 'dark';
    capabilities?: Partial<HostCapabilities>;
    contextualRefs?: Record<string, string>;
  } = {},
): HostContext {
  return {
    hostId,
    hostName,
    activeProjectId: null,
    theme: options.theme ?? 'dark',
    capabilities: {
      canSelectProject: true,
      canNavigate: true,
      supportsTheming: true,
      supportsMultiProject: false,
      ...options.capabilities,
    },
    contextualRefs: options.contextualRefs ?? {},
  };
}
