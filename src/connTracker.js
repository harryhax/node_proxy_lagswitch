export const activeIncoming = new Set(); // client→proxy TCP sockets
export const activeOutgoing = new Set(); // proxy→upstream TCP sockets
export let totalIncoming = 0;
export let totalOutgoing = 0;

export function hookIncomingConnectionTracking(server) {
  server.on('connection', (socket) => {
    totalIncoming += 1;
    activeIncoming.add(socket);
    socket.on('close', () => activeIncoming.delete(socket));
  });
}

export function trackOutgoingSocket(sock) {
  if (!sock || activeOutgoing.has(sock)) return;
  totalOutgoing += 1;
  activeOutgoing.add(sock);
  sock.on('close', () => activeOutgoing.delete(sock));
}

export function dropAllConnections(reason = 'manual') {
  let droppedIn = 0, droppedOut = 0;
  for (const s of [...activeIncoming]) { try { s.destroy(); droppedIn++; } catch {} }
  for (const s of [...activeOutgoing]) { try { s.destroy(); droppedOut++; } catch {} }
  if (process.env.VERBOSE === '1') {
    console.log(`[DROP] closed in:${droppedIn} out:${droppedOut} (${reason})`);
  }
}
