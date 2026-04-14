import url from 'url';

/** Clear the terminal screen and move cursor to top-left. */
export const clear = () => process.stdout.write('\x1b[2J\x1b[H');

/** Right-pad string `s` to exactly `n` characters. */
export const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);

/** Format milliseconds for display. 0 means infinite (∞). */
export const fmtMs = (ms) => ms === 0 ? '∞' : `${ms}ms`;

/**
 * Clone request headers and strip hop-by-hop / proxy-specific headers
 * so they aren't forwarded to the upstream server.
 */
export function stripProxyHeaders(headers) {
  const h = { ...headers };
  delete h['proxy-connection'];
  delete h['proxy-authorization'];
  delete h['connection'];
  delete h['upgrade'];
  return h;
}

/**
 * Normalise the request URL into an absolute URL.
 * Proxy requests usually arrive as absolute URLs; fall back to
 * constructing one from the Host header for relative paths.
 */
export function asTargetUrl(req) {
  const parsed = url.parse(req.url);
  return parsed.protocol ? req.url : `http://${req.headers.host}${req.url}`;
}

/**
 * STALL mode helper – holds a socket/response open without sending data.
 * If stallMs > 0, destroys the target after the timeout elapses.
 * If stallMs === 0 (infinite), falls back to the idle-socket timeout
 * so the OS eventually reclaims the resource.
 */
export function applyStallAndMaybeDrop(target, state) {
  if (state.stallMs > 0) {
    // Finite stall: schedule a forced destroy after stallMs
    const timer = setTimeout(() => {
      try { target.destroy(); } catch {}
    }, state.stallMs);
    // Cancel the timer if the connection closes on its own
    if ('once' in target) target.once('close', () => clearTimeout(timer));
  } else {
    // Infinite stall: let the socket idle-timeout handle cleanup
    if ('setTimeout' in target) target.setTimeout(state.socketIdleMs, () => {
      try { target.destroy(); } catch {}
    });
  }
}
