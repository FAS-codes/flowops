import { createServer } from 'http';
import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { initRealtime } from './realtime';

async function main() {
  await connectDb();
  const app = createApp();
  const server = createServer(app);
  initRealtime(server); // attach Socket.IO to the same HTTP server
  server.listen(env.port, () => {
    console.log(`[server] FlowOps API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
