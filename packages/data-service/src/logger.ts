type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

function formatEntry(entry: LogEntry): string {
  const meta = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${meta}`;
}

function createEntry(level: LogLevel, message: string, metadata?: Record<string, unknown>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata,
  };
}

function write(entry: LogEntry): void {
  const line = formatEntry(entry);
  switch (entry.level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    default:
      console.log(line);
      break;
  }
}

export const logger = {
  info(message: string, metadata?: Record<string, unknown>) {
    write(createEntry('info', message, metadata));
  },

  warn(message: string, metadata?: Record<string, unknown>) {
    write(createEntry('warn', message, metadata));
  },

  error(message: string, metadata?: Record<string, unknown>) {
    write(createEntry('error', message, metadata));
  },
};
