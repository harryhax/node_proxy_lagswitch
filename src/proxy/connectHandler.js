import net from 'net';
import { state } from '../state.js';
import { applyStallAndMaybeDrop } from '../util.js';
import { trackOutgoingSocket } from '../connTracker.js';

/**
 * Handle an HTTPS CONNECT tunnel request.
 * The client asks the proxy to open a raw TCP connection to host:port.
 * If traffic is blocked, we either reject with 503 or stall.
 * Otherwise we establish the tunnel and pipe data bidirectionally.
 */
export function handleConnect(req, clientSocket, head) {
  const [host, portStr] = String(req.url).split(':');
  const port = parseInt(portStr || '443', 10);

  if (state.verbose) console.log(`[TLS ] CONNECT ${host}:${port}`);

  // --- Blocking branch ---
  if (state.blockTraffic) {
    if (state.blockMode === 'STATUS') {
      try { clientSocket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n'); } catch {}
      return clientSocket.end();
    }
    // STALL: hold the client socket open; auto-drop after stallMs (or hang if ∞)
    applyStallAndMaybeDrop(clientSocket, state);
    return;
  }

  // --- Tunneling branch ---
  const upstream = net.connect(port, host);
  trackOutgoingSocket(upstream);

  /** Cleanup helper – tears down both ends and logs in verbose mode. */
  const bail = (label, err) => {
    if (err && state.verbose) console.error(`[TLS ] ${label} error:`, err.message || err);
    try { clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n'); } catch {}
    try { clientSocket.destroy(); } catch {}
    try { upstream.destroy(); } catch {}
  };

  upstream.once('connect', () => {
    try {
      // Tell the client the tunnel is ready
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      // Forward any buffered data the client sent after the CONNECT header
      if (head && head.length) upstream.write(head);
    } catch (e) { return bail('handshake', e); }

    // Bidirectional pipe – proxy becomes transparent
    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });

  // Error & idle-timeout handling for both sides
  upstream.on('error', (e) => bail('upstream', e));
  clientSocket.on('error', (e) => bail('client', e));
  upstream.setTimeout(state.socketIdleMs, () => bail('upstream-timeout'));
  clientSocket.setTimeout(state.socketIdleMs, () => bail('client-timeout'));
}
