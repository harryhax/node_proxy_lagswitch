import { state } from './state.js';
import { dropAllConnections, activeIncoming, activeOutgoing, totalIncoming, totalOutgoing } from './connTracker.js';
import { fmtMs } from './util.js';

/** Send a JSON response with the given HTTP status code. */
function send(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

/**
 * Route admin API requests (URLs starting with state.adminPrefix).
 * Provides endpoints to read/mutate proxy state and view metrics.
 */
export function handleAdmin(req, res) {
  const u = new URL(req.url, 'http://local');
  const p = u.pathname;

  // GET /_/status – return current proxy state snapshot
  if (p === `${state.adminPrefix}status`) {
    return send(res, 200, {
      state: state.blockTraffic ? 'BLOCKED' : 'OPEN',
      mode: state.blockMode,
      scope: state.blockScope,
      stallMs: state.stallMs,
      stallPretty: fmtMs(state.stallMs),
      pid: process.pid
    });
  }
  // GET /_/toggle | /_/open | /_/block – quick traffic controls
  if (p === `${state.adminPrefix}toggle`) { state.toggleBlocked(); return send(res, 200, { ok: true }); }
  if (p === `${state.adminPrefix}open`)   { state.setBlocked(false);  return send(res, 200, { ok: true }); }
  if (p === `${state.adminPrefix}block`)  { state.setBlocked(true);   return send(res, 200, { ok: true }); }

  // GET /_/mode?value=STALL|STATUS – set blocking mode
  if (p === `${state.adminPrefix}mode`) {
    const v = u.searchParams.get('value');
    if (!v) return send(res, 400, { ok: false, error: 'value=STALL|STATUS' });
    if (!state.setMode(v)) return send(res, 400, { ok: false, error: 'invalid mode' });
    return send(res, 200, { ok: true, mode: state.blockMode });
  }

  // GET /_/scope?value=NEW|ALL – set blocking scope
  if (p === `${state.adminPrefix}scope`) {
    const v = u.searchParams.get('value');
    if (!v) return send(res, 400, { ok: false, error: 'value=NEW|ALL' });
    if (!state.setScope(v)) return send(res, 400, { ok: false, error: 'invalid scope' });
    return send(res, 200, { ok: true, scope: state.blockScope });
  }

  // GET /_/stall[?ms=N] – read or set stall duration
  if (p === `${state.adminPrefix}stall`) {
    const v = u.searchParams.get('ms');
    if (v == null) return send(res, 200, { ms: state.stallMs, pretty: fmtMs(state.stallMs) });
    if (!state.setStallMs(v)) return send(res, 400, { ok: false, error: 'invalid ms' });
    return send(res, 200, { ok: true, ms: state.stallMs, pretty: fmtMs(state.stallMs) });
  }

  // GET /_/metrics – active/total connection counts
  if (p === `${state.adminPrefix}metrics`) {
    return send(res, 200, {
      activeIncoming: activeIncoming.size,
      activeOutgoing: activeOutgoing.size,
      totalIncoming,
      totalOutgoing
    });
  }

  // GET /_/drop – immediately destroy all tracked sockets
  if (p === `${state.adminPrefix}drop`) {
    dropAllConnections('admin-drop');
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { ok: false, error: 'unknown admin endpoint' });
}
