import http from 'http';
import { state } from '../state.js';
import { stripProxyHeaders, asTargetUrl, applyStallAndMaybeDrop } from '../util.js';
import { trackOutgoingSocket } from '../connTracker.js';

/**
 * Handle a plain HTTP proxy request.
 * If traffic is blocked, either returns 503 (STATUS mode) or
 * holds the response open (STALL mode). Otherwise forwards the
 * request to the upstream server and pipes the response back.
 */
export function handleHttp(req, res) {
  const targetUrl = asTargetUrl(req);
  const u = new URL(targetUrl);

  if (state.verbose) console.log(`[HTTP] ${req.method} ${targetUrl}`);

  // --- Blocking branch ---
  if (state.blockTraffic) {
    if (state.blockMode === 'STATUS') {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Proxy temporarily blocking traffic');
      return;
    }
    // STALL: hold the response open; auto-drop after stallMs (or hang if ∞)
    applyStallAndMaybeDrop(res, state);
    return;
  }

  // --- Forwarding branch ---
  const opts = {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    method: req.method,
    path: u.pathname + u.search,
    headers: stripProxyHeaders(req.headers),
  };

  const start = Date.now();
  const upstream = http.request(opts, (upRes) => {
    // Relay upstream status + headers back to client, then pipe body
    res.writeHead(upRes.statusCode || 502, upRes.headers);
    upRes.pipe(res);
    upRes.on('end', () => {
      if (state.verbose) console.log(`[HTTP] ${req.method} ${targetUrl} -> ${upRes.statusCode} (${Date.now() - start}ms)`);
    });
  });

  // Track the outgoing socket for metrics / mass-drop
  upstream.on('socket', (sock) => trackOutgoingSocket(sock));

  upstream.on('error', (err) => {
    if (state.verbose) console.error(`[HTTP] ${req.method} ${targetUrl} -> ERROR ${err.code || err.message}`);
    if (!res.headersSent) res.writeHead(502);
    res.end('Bad gateway');
  });

  // Pipe client body to upstream and enforce an idle timeout
  req.pipe(upstream);
  res.setTimeout(state.socketIdleMs, () => res.destroy());
}
