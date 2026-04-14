import net from 'net';
import { state } from '../state.js';
import { applyStallAndMaybeDrop } from '../util.js';
import { trackOutgoingSocket } from '../connTracker.js';

export function handleConnect(req, clientSocket, head) {
  const [host, portStr] = String(req.url).split(':');
  const port = parseInt(portStr || '443', 10);

  if (state.verbose) console.log(`[TLS ] CONNECT ${host}:${port}`);

  if (state.blockTraffic) {
    if (state.blockMode === 'STATUS') {
      try { clientSocket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n'); } catch {}
      return clientSocket.end();
    }
    // STALL: hold the client socket; maybe drop after stallMs
    applyStallAndMaybeDrop(clientSocket, state);
    return;
  }

  const upstream = net.connect(port, host);
  trackOutgoingSocket(upstream);

  const bail = (label, err) => {
    if (err && state.verbose) console.error(`[TLS ] ${label} error:`, err.message || err);
    try { clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n'); } catch {}
    try { clientSocket.destroy(); } catch {}
    try { upstream.destroy(); } catch {}
  };

  upstream.once('connect', () => {
    try {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head && head.length) upstream.write(head);
    } catch (e) { return bail('handshake', e); }

    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });

  upstream.on('error', (e) => bail('upstream', e));
  clientSocket.on('error', (e) => bail('client', e));
  upstream.setTimeout(state.socketIdleMs, () => bail('upstream-timeout'));
  clientSocket.setTimeout(state.socketIdleMs, () => bail('client-timeout'));
}
