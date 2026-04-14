import http from 'http';
import { handleHttp } from './proxy/httpHandler.js';
import { handleConnect } from './proxy/connectHandler.js';
import { handleAdmin } from './admin.js';
import { hookIncomingConnectionTracking } from './connTracker.js';
import { state } from './state.js';

export function startServer(port, onListening) {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith(state.adminPrefix)) return handleAdmin(req, res);
    return handleHttp(req, res);
  });

  server.on('connect', handleConnect);
  hookIncomingConnectionTracking(server);

  server.listen(port, onListening);

  // graceful shutdown
  process.on('SIGINT', () => {
    process.stdout.write('\x1b[2J\x1b[H');
    console.log('Shutting down...');
    server.close(() => process.exit(0));
  });

  return server;
}
