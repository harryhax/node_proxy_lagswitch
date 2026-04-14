import http from 'http';
import { handleHttp } from './proxy/httpHandler.js';
import { handleConnect } from './proxy/connectHandler.js';
import { handleAdmin } from './admin.js';
import { hookIncomingConnectionTracking } from './connTracker.js';
import { state } from './state.js';

/**
 * Create and start the HTTP proxy server.
 * Routes admin-prefixed URLs to the admin handler, all other
 * HTTP requests to the proxy handler, and CONNECT requests
 * to the tunnel handler.
 */
export function startServer(port, onListening) {
  const server = http.createServer((req, res) => {
    // Admin API takes priority over proxy forwarding
    if (req.url.startsWith(state.adminPrefix)) return handleAdmin(req, res);
    return handleHttp(req, res);
  });

  // HTTPS tunnel requests arrive as 'connect' events
  server.on('connect', handleConnect);
  // Start tracking all inbound TCP connections
  hookIncomingConnectionTracking(server);

  server.listen(port, onListening);

  // Graceful shutdown: clear screen, stop accepting, then exit
  process.on('SIGINT', () => {
    process.stdout.write('\x1b[2J\x1b[H');
    console.log('Shutting down...');
    server.close(() => process.exit(0));
  });

  return server;
}
