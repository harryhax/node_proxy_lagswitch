/** Active client→proxy TCP sockets (for metrics & mass-drop). */
export const activeIncoming = new Set();
/** Active proxy→upstream TCP sockets. */
export const activeOutgoing = new Set();
/** Cumulative count of all incoming connections since startup. */
export let totalIncoming = 0;
/** Cumulative count of all outgoing connections since startup. */
export let totalOutgoing = 0;

/**
 * Attach a 'connection' listener to the HTTP server so every new
 * client socket is tracked in activeIncoming and counted.
 */
export function hookIncomingConnectionTracking(server) {
  server.on('connection', (socket) => {
    totalIncoming += 1;
    activeIncoming.add(socket);
    socket.on('close', () => activeIncoming.delete(socket));
  });
}

/**
 * Register a proxy→upstream socket for tracking.
 * Deduplicates so the same socket isn't counted twice.
 */
export function trackOutgoingSocket(sock) {
  if (!sock || activeOutgoing.has(sock)) return;
  totalOutgoing += 1;
  activeOutgoing.add(sock);
  sock.on('close', () => activeOutgoing.delete(sock));
}

/**
 * Force-close every tracked socket (incoming + outgoing).
 * Used by scope=ALL blocking and the admin /_/drop endpoint.
 */
export function dropAllConnections(reason = 'manual') {
  let droppedIn = 0, droppedOut = 0;
  for (const s of [...activeIncoming]) { try { s.destroy(); droppedIn++; } catch {} }
  for (const s of [...activeOutgoing]) { try { s.destroy(); droppedOut++; } catch {} }
  if (process.env.VERBOSE === '1') {
    console.log(`[DROP] closed in:${droppedIn} out:${droppedOut} (${reason})`);
  }
}
