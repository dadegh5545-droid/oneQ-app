import { RepositoryError } from '@/data/repository';

// Error reporting and diagnostic logging behind one interface. No crash-reporting service is connected yet:
// call setMonitoringProvider (e.g. a Sentry adapter) at start-up. Everything is scrubbed before it leaves.

export type LogContext = Record<string, string | number | boolean | null | undefined>;

export interface MonitoringProvider {
  captureException(error: Error, context: LogContext): void;
  captureMessage(message: string, level: 'info' | 'warning' | 'error', context: LogContext): void;
}

// JWTs, guest booking tokens ("bk-….<secret>"), emails and phone numbers never leave the device in logs.
const TOKENS = /eyJ[\w-]+\.[\w-]+\.[\w-]+|bk-[0-9a-f-]{36}\.[\w-]+/g;
const EMAIL = /[^\s@"']+@[^\s@"']+\.[^\s@"']+/g;
const PHONE = /\+?\d[\d\s-]{7,}\d/g;
const SENSITIVE_KEY = /password|token|secret|email|phone|authorization|^code$/i;

export const scrub = (text: string) => text.replace(TOKENS, '[token]').replace(EMAIL, '[email]').replace(PHONE, '[phone]');

const scrubContext = (context: LogContext = {}): LogContext =>
  Object.fromEntries(
    Object.entries(context)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .map(([key, value]) => [key, typeof value === 'string' ? scrub(value) : value]),
  );

const devProvider: MonitoringProvider = {
  captureException: (error, context) => console.warn('[monitoring]', error.name, error.message, context),
  captureMessage: (message, level, context) => console.log(`[monitoring:${level}]`, message, context),
};
const silentProvider: MonitoringProvider = { captureException: () => undefined, captureMessage: () => undefined };

let provider: MonitoringProvider = __DEV__ ? devProvider : silentProvider;

export const setMonitoringProvider = (next: MonitoringProvider) => {
  provider = next;
};

// RepositoryErrors are expected, user-facing outcomes (validation, slot taken, offline…); only unexpected
// failures — including backend DATA_ERRORs, which are not mapped to a code — are reported.
export function reportError(error: unknown, context?: LogContext) {
  if (error instanceof RepositoryError) return;
  const original = error instanceof Error ? error : new Error(String(error));
  const safe = new Error(scrub(original.message));
  safe.name = original.name;
  safe.stack = original.stack ? scrub(original.stack) : undefined;
  try {
    provider.captureException(safe, scrubContext(context));
  } catch {
    // Reporting must never break the app.
  }
}

export function logEvent(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: LogContext) {
  try {
    provider.captureMessage(scrub(message), level, scrubContext(context));
  } catch {
    // ignore
  }
}

type ErrorUtilsShape = { getGlobalHandler(): (error: unknown, isFatal?: boolean) => void; setGlobalHandler(h: (error: unknown, isFatal?: boolean) => void): void };

// Native uncaught JS errors (crashes) are reported before React Native's default handler runs.
export function installGlobalErrorHandler() {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    reportError(error, { fatal: !!isFatal });
    previous(error, isFatal);
  });
}
