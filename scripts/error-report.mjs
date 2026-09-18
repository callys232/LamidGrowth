import { readDailyErrors } from '../src/app/errorLog.mjs';

const day = process.argv[2] || new Date().toISOString().slice(0, 10);
const directory = process.env.ERROR_LOG_DIR || 'data/logs';
try {
  const entries = readDailyErrors(directory, day);
  const counts = new Map();
  for (const entry of entries) {
    const key = `${entry.event} ${entry.status || ''} ${entry.path || ''}`.trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  console.log(`Errors for ${day} (UTC): ${entries.length}`);
  for (const [key, count] of [...counts].sort((a, b) => b[1] - a[1]))
    console.log(`${String(count).padStart(5)}  ${key}`);
  for (const entry of entries.slice(-20))
    console.log(
      `${entry.timestamp} ${entry.requestId || '-'} ${entry.event} ${entry.method || ''} ${entry.path || ''} ${entry.error?.message || ''}`.trim(),
    );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
