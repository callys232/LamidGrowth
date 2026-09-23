import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dayPattern = /^errors-(\d{4}-\d{2}-\d{2})\.jsonl$/;

export function errorDetails(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    name: error instanceof Error ? error.name : 'Error',
    ...(error?.databaseFailure
      ? {
          database: {
            code: error.code || 'CONNECTION_ERROR',
            pool: error.databasePool,
            commitOutcomeUnknown: Boolean(error.commitOutcomeUnknown),
          },
        }
      : {}),
    // Logs are operational records. Never copy request bodies, query strings or headers here.
    message: message.slice(0, 1000),
    ...(error instanceof Error && error.stack ? { stack: error.stack.slice(0, 6000) } : {}),
  };
}

export function logHandledError(req, res, event, error, status = 502) {
  res.locals.errorLogged = true;
  req.app.locals.errorLogger?.(event, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    status,
    ...(req.user?.id ? { userId: req.user.id } : {}),
    error: errorDetails(error),
  });
}

export function createErrorLogger({
  directory = process.env.ERROR_LOG_DIR || 'data/logs',
  now = () => new Date(),
  stderr = console.error,
} = {}) {
  return (event, fields = {}) => {
    const timestamp = now().toISOString();
    const entry = { timestamp, event, pid: process.pid, ...fields };
    const line = JSON.stringify(entry);
    stderr(line);
    try {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      appendFileSync(join(directory, `errors-${timestamp.slice(0, 10)}.jsonl`), `${line}\n`, {
        mode: 0o600,
      });
    } catch (writeError) {
      stderr(
        JSON.stringify({ timestamp, event: 'error_log_write_failed', message: String(writeError) }),
      );
    }
    return entry;
  };
}

export function readDailyErrors(directory, day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Use a YYYY-MM-DD date.');
  const file = `errors-${day}.jsonl`;
  if (!existsSync(directory)) return [];
  if (
    !readdirSync(directory, { withFileTypes: true }).some(
      (item) => item.isFile() && item.name === file && dayPattern.test(item.name),
    )
  )
    return [];
  return readFileSync(join(directory, file), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
