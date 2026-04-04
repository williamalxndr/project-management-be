import { getEnv } from '../config/env.js';

const levelWeight = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const;

type LogLevel = keyof typeof levelWeight;

type LogMetadata = Record<string, unknown> | undefined;

const shouldLog = (messageLevel: LogLevel, threshold: LogLevel): boolean => {
  return levelWeight[messageLevel] >= levelWeight[threshold];
};

const writeLog = (level: LogLevel, message: string, metadata?: LogMetadata): void => {
  const env = getEnv();

  if (!shouldLog(level, env.logLevel)) {
    return;
  }

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(metadata ?? {}),
  };

  const output = JSON.stringify(payload);

  if (level === 'error') {
    console.error(output);
    return;
  }

  if (level === 'warn') {
    console.warn(output);
    return;
  }

  console.log(output);
};

export const logger = {
  debug: (message: string, metadata?: LogMetadata): void => writeLog('debug', message, metadata),
  info: (message: string, metadata?: LogMetadata): void => writeLog('info', message, metadata),
  warn: (message: string, metadata?: LogMetadata): void => writeLog('warn', message, metadata),
  error: (message: string, metadata?: LogMetadata): void => writeLog('error', message, metadata),
};
