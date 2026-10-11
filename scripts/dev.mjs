import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

if (existsSync('.env')) process.loadEnvFile('.env');
const port = Number(process.env.PORT || 3000);
const guard = createServer();
guard.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `A development server is already running for port ${port}. Use that process instead of starting another.`
      : error.message,
  );
  process.exitCode = 1;
});
const guardName = createHash('sha256').update(process.cwd()).digest('hex').slice(0, 16);
const guardAddress =
  process.platform === 'win32'
    ? `\\\\.\\pipe\\lamid-dev-${guardName}`
    : { port: port + 20000, host: '127.0.0.1' };
guard.listen(guardAddress, () => {
  const child = spawn(
    process.execPath,
    [
      '--watch-path=server',
      '--watch-path=src/app',
      '--watch-path=vite.config.ts',
      'server/index.mjs',
    ],
    { stdio: 'inherit' },
  );
  child.on('error', (error) => {
    console.error(error.message);
    guard.close();
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    guard.close();
    process.exitCode = code || 0;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
});
